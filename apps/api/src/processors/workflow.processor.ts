import { buildDependencyMap, detectCycles, topologicalSort } from '@genfeedai/core';
import type { WorkflowInputNodeData, WorkflowOutputNodeData } from '@genfeedai/types';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { WorkflowJobData, WorkflowRefJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';
import { QUEUE_PASSTHROUGH_TYPES } from '@/registry/node-type.registry';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import type { WorkflowsService } from '@/services/workflows.service';
import type { NodeOutput, PendingNode } from '@/interfaces/execution-types.interface';
import type { WorkflowEdge, WorkflowNode } from '@/interfaces/workflow.interface';

@Processor(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'WorkflowsService'))
    private readonly workflowsService: WorkflowsService,
    @Inject(forwardRef(() => 'WorkflowInterfaceService'))
    readonly _workflowInterfaceService: WorkflowInterfaceService
  ) {
    super();
  }

  async process(job: Job<WorkflowJobData | WorkflowRefJobData>): Promise<void> {
    // Check if this is a workflowRef job (nested execution)
    if ('nodeType' in job.data && job.data.nodeType === 'workflowRef') {
      return this.processWorkflowRef(job as Job<WorkflowRefJobData>);
    }

    // Regular workflow orchestration
    return this.processWorkflowOrchestration(job as Job<WorkflowJobData>);
  }

  /**
   * Process a workflow orchestration job - sequential execution model
   * Only enqueues nodes that are ready (no unmet dependencies)
   * Webhook handler continues execution when nodes complete
   *
   * If selectedNodeIds is provided, only those nodes will be executed.
   * Dependencies of selected nodes are still included to ensure correct execution.
   */
  private async processWorkflowOrchestration(job: Job<WorkflowJobData>): Promise<void> {
    const { executionId, workflowId, debugMode, selectedNodeIds } = job.data;

    this.logger.log(
      `Processing workflow execution: ${executionId}${selectedNodeIds?.length ? ` (partial: ${selectedNodeIds.length} nodes)` : ''}`
    );

    try {
      // Update execution status to running
      await this.executionsService.updateExecutionStatus(executionId, 'running');

      // Update job status in MongoDB
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Get workflow definition
      const workflow = await this.workflowsService.findOne(workflowId);

      const nodes = workflow.nodes as WorkflowNode[];
      const edges = workflow.edges as WorkflowEdge[];

      // Check for cycles before processing
      if (detectCycles(nodes, edges)) {
        throw new Error('Workflow contains cycles');
      }

      // Topologically sort nodes based on edges
      const executionOrder = topologicalSort(nodes, edges);

      this.logger.log(`Workflow ${workflowId} has ${executionOrder.length} nodes to execute`);

      // Get dependency map for each node
      const dependencyMap = buildDependencyMap(nodes, edges);

      // Build pending nodes list (excluding passthrough nodes like input/output)
      const pendingNodes: PendingNode[] = [];

      // Collect passthrough node IDs first
      const passthroughNodeIds = new Set<string>();
      for (const nodeId of executionOrder) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node && QUEUE_PASSTHROUGH_TYPES.includes(node.type)) {
          passthroughNodeIds.add(nodeId);
        }
      }

      // If selectedNodeIds is provided, compute the set of nodes to execute
      // This includes selected nodes AND their required dependencies (that don't have cached output)
      const selectedNodeSet =
        selectedNodeIds && selectedNodeIds.length > 0 ? new Set(selectedNodeIds) : null;

      // Helper to check if a node already has output cached in its data
      const hasExistingOutput = (node: WorkflowNode): boolean => {
        const data = node.data || {};
        // Check for common output fields across node types
        const outputImages = data.outputImages as unknown[] | undefined;
        return !!(
          data.outputImage ||
          (outputImages && outputImages.length > 0) ||
          data.outputVideo ||
          data.outputAudio ||
          data.outputText ||
          data.output
        );
      };

      // Helper to convert node.data output format to execution output format
      // Node data stores: outputImage, outputVideo, etc.
      // Execution expects: output, text, etc. (accessed via sourceHandle)
      const getExecutionOutputFormat = (node: WorkflowNode): NodeOutput => {
        const data = node.data || {};
        const result: NodeOutput = {};

        // Map outputImage/outputImages -> output/outputs (image nodes use 'output' handle)
        if (data.outputImage) {
          result.output = data.outputImage;
        }
        const outputImages = data.outputImages as string[] | undefined;
        if (outputImages && outputImages.length > 0) {
          result.outputs = outputImages;
          result.images = outputImages;
          // Also set output to first image for single-image consumers
          if (!result.output && outputImages[0]) {
            result.output = outputImages[0];
          }
        }

        // Map outputVideo -> output (video nodes use 'output' handle)
        if (data.outputVideo) {
          result.output = data.outputVideo as string;
          result.video = data.outputVideo as string;
        }

        // Map outputAudio -> output (audio nodes use 'output' handle)
        if (data.outputAudio) {
          result.output = data.outputAudio as string;
          result.audio = data.outputAudio as string;
        }

        // Map outputText -> text (LLM nodes use 'text' handle)
        if (data.outputText) {
          result.text = data.outputText as string;
        }

        // Keep output as-is if already in correct format
        if (data.output) {
          result.output = data.output;
        }

        return result;
      };

      // Track nodes with cached output that should be marked complete but not re-executed
      const cachedOutputNodeIds = new Set<string>();

      // Helper to get dependencies that need execution (don't have cached output)
      const getDependenciesToExecute = (
        nodeId: string,
        visited = new Set<string>()
      ): Set<string> => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);

        const deps = dependencyMap.get(nodeId) ?? [];
        for (const depId of deps) {
          const depNode = nodes.find((n) => n.id === depId);
          if (!depNode) continue;

          // If dependency has cached output, mark it but don't add to execution
          if (hasExistingOutput(depNode) && !selectedNodeSet?.has(depId)) {
            cachedOutputNodeIds.add(depId);
          } else {
            // Dependency needs execution, recurse to its dependencies
            getDependenciesToExecute(depId, visited);
          }
        }
        return visited;
      };

      // Compute the execution set: selected nodes + dependencies WITHOUT cached output
      let executionSet: Set<string> | null = null;
      if (selectedNodeSet) {
        executionSet = new Set<string>();
        for (const nodeId of selectedNodeSet) {
          const depsToExecute = getDependenciesToExecute(nodeId);
          for (const dep of depsToExecute) {
            executionSet.add(dep);
          }
        }
        this.logger.log(
          `Partial execution: ${selectedNodeSet.size} selected, ${executionSet.size} to execute, ${cachedOutputNodeIds.size} cached`
        );
      }

      // Mark cached output nodes as complete first (their outputs are already available)
      for (const nodeId of cachedOutputNodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          // Convert node.data output format to execution output format
          const executionOutput = getExecutionOutputFormat(node);
          await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
            ...executionOutput,
            cached: true,
          });
          this.logger.log(`Using cached output for node ${nodeId} (${node.type})`);
        }
      }

      for (const nodeId of executionOrder) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        // Skip passthrough nodes - mark as complete immediately
        if (passthroughNodeIds.has(nodeId)) {
          await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {});
          continue;
        }

        // Skip nodes with cached output - already marked complete above
        if (cachedOutputNodeIds.has(nodeId)) {
          continue;
        }

        // For partial execution, skip nodes not in the execution set
        if (executionSet && !executionSet.has(nodeId)) {
          continue;
        }

        // Filter out passthrough nodes and cached nodes from dependencies since they're already complete
        // Also filter out nodes not in the execution set (for partial execution)
        const dependsOn = (dependencyMap.get(nodeId) ?? []).filter(
          (depId) =>
            !passthroughNodeIds.has(depId) &&
            !cachedOutputNodeIds.has(depId) &&
            (!executionSet || executionSet.has(depId))
        );
        pendingNodes.push({
          dependsOn,
          nodeData: node.data,
          nodeId: node.id,
          nodeType: node.type,
        });
      }

      // Save all pending nodes to execution for continuation
      await this.executionsService.setPendingNodes(executionId, pendingNodes);

      // Find nodes with no dependencies (ready to execute)
      const readyNodes = pendingNodes.filter((n) => n.dependsOn.length === 0);

      if (readyNodes.length === 0 && pendingNodes.length > 0) {
        throw new Error('No nodes ready to execute - possible circular dependency');
      }

      // Enqueue ALL ready nodes (parallel execution)
      // Nodes with no unmet dependencies can run concurrently
      if (readyNodes.length > 0) {
        const workflowDef = { edges, nodes };
        for (const readyNode of readyNodes) {
          await this.queueManager.enqueueNode(
            executionId,
            workflowId,
            readyNode.nodeId,
            readyNode.nodeType,
            readyNode.nodeData,
            readyNode.dependsOn,
            workflowDef,
            { debugMode }
          );
          await this.executionsService.removeFromPendingNodes(executionId, readyNode.nodeId);
        }

        this.logger.log(
          `Enqueued ${readyNodes.length} ready node(s) in parallel - ${pendingNodes.length - readyNodes.length} nodes pending`
        );
      }

      // Update job status to completed (orchestrator is done, execution continues via webhooks)
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED);

      this.logger.log(`Workflow orchestration completed for execution: ${executionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.FAILED, {
        error: errorMessage,
      });

      await this.executionsService.updateExecutionStatus(executionId, 'failed', errorMessage);

      throw error;
    }
  }

  /**
   * Process a workflowRef node - executes a referenced workflow as a child execution
   */
  private async processWorkflowRef(job: Job<WorkflowRefJobData>): Promise<void> {
    const { executionId, nodeId, nodeData, parentExecutionId, parentNodeId, depth } = job.data;
    const { referencedWorkflowId, inputMappings, cachedInterface } = nodeData;

    this.logger.log(
      `Processing workflowRef node ${nodeId} referencing workflow ${referencedWorkflowId} at depth ${depth}`
    );

    try {
      // Prevent infinite recursion
      const MAX_DEPTH = 10;
      if (depth >= MAX_DEPTH) {
        throw new Error(`Maximum workflow nesting depth (${MAX_DEPTH}) exceeded`);
      }

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Fetch the referenced workflow (always get latest version for live references)
      const childWorkflow = await this.workflowsService.findOne(referencedWorkflowId);
      const childNodes = childWorkflow.nodes as WorkflowNode[];
      const childEdges = childWorkflow.edges as WorkflowEdge[];

      // Create child execution record
      const childExecution = await this.executionsService.createChildExecution(
        referencedWorkflowId,
        parentExecutionId,
        parentNodeId,
        depth + 1
      );

      const childExecutionId = childExecution._id as import('mongoose').Types.ObjectId;

      // Link child execution to parent
      await this.executionsService.addChildExecution(parentExecutionId, childExecutionId);

      this.logger.log(
        `Created child execution ${childExecutionId.toString()} for workflow ${referencedWorkflowId}`
      );

      // Map input values to WorkflowInput nodes in the child workflow
      for (const node of childNodes) {
        if (node.type === 'workflowInput') {
          const inputData = node.data as WorkflowInputNodeData;
          const inputName = inputData.inputName || 'input';
          const inputValue = inputMappings[inputName];

          if (inputValue !== undefined && inputValue !== null) {
            // Pre-populate the WorkflowInput node's output with the parent's input value
            await this.executionsService.updateNodeResult(
              childExecutionId.toString(),
              node.id,
              'complete',
              { value: inputValue }
            );
            this.logger.log(
              `Mapped input "${inputName}" = ${typeof inputValue === 'string' ? `${inputValue.substring(0, 50)}...` : inputValue} to node ${node.id}`
            );
          } else if (inputData.required) {
            throw new Error(`Required input "${inputName}" not provided for child workflow`);
          }
        }
      }

      // Execute the child workflow (enqueue all its nodes)
      if (detectCycles(childNodes, childEdges)) {
        throw new Error('Child workflow contains cycles');
      }

      const childExecutionOrder = topologicalSort(childNodes, childEdges);
      const childDependencyMap = buildDependencyMap(childNodes, childEdges);

      // Enqueue child workflow nodes (skip WorkflowInput nodes as they're pre-populated)
      // Pass child workflow definition for input resolution
      const childWorkflowDef = { edges: childEdges, nodes: childNodes };
      for (const childNodeId of childExecutionOrder) {
        const childNode = childNodes.find((n) => n.id === childNodeId);
        if (!childNode) continue;

        // Skip WorkflowInput nodes - their values are already set from parent
        if (childNode.type === 'workflowInput') {
          continue;
        }

        const childDependsOn = childDependencyMap.get(childNodeId) ?? [];

        await this.queueManager.enqueueNode(
          childExecutionId.toString(),
          referencedWorkflowId,
          childNode.id,
          childNode.type,
          childNode.data,
          childDependsOn,
          childWorkflowDef
        );
      }

      // Wait for child execution to complete (polling)
      const childOutputs = await this.waitForChildExecution(
        childExecutionId.toString(),
        cachedInterface.outputs,
        childNodes
      );

      // Map child outputs back to the parent workflowRef node
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        childExecutionId: childExecutionId.toString(),
        outputMappings: childOutputs,
      });

      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: { childExecutionId: childExecutionId.toString(), outputMappings: childOutputs },
      });

      this.logger.log(
        `WorkflowRef node ${nodeId} completed. Child execution: ${childExecutionId.toString()}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.FAILED, {
        error: errorMessage,
      });

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
    }
  }

  /**
   * Wait for a child execution to complete and extract outputs from WorkflowOutput nodes
   */
  private async waitForChildExecution(
    childExecutionId: string,
    expectedOutputs: Array<{ nodeId: string; name: string; type: string }>,
    childNodes: WorkflowNode[]
  ): Promise<Record<string, string | null>> {
    const maxAttempts = 360; // 30 minutes at 5-second intervals
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const childExecution = await this.executionsService.findExecution(childExecutionId);

      if (childExecution.status === 'completed') {
        // Extract outputs from WorkflowOutput nodes
        const outputs: Record<string, string | null> = {};

        for (const expectedOutput of expectedOutputs) {
          const outputNode = childNodes.find(
            (n) => n.id === expectedOutput.nodeId && n.type === 'workflowOutput'
          );
          if (!outputNode) continue;

          const nodeResult = childExecution.nodeResults.find(
            (r: { nodeId: string }) => r.nodeId === expectedOutput.nodeId
          );
          if (nodeResult?.output) {
            const outputData = outputNode.data as WorkflowOutputNodeData;
            const outputName = outputData.outputName || 'output';
            outputs[outputName] = (nodeResult.output as { value?: string }).value ?? null;
          }
        }

        return outputs;
      }

      if (childExecution.status === 'failed' || childExecution.status === 'cancelled') {
        throw new Error(
          `Child execution ${childExecutionId} ${childExecution.status}: ${childExecution.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Child execution ${childExecutionId} timed out`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WorkflowJobData>): void {
    this.logger.log(`Workflow job completed: ${job.id} for execution ${job.data.executionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WorkflowJobData>, error: Error): void {
    this.logger.error(
      `Workflow job failed: ${job.id} for execution ${job.data.executionId}`,
      error.stack
    );
  }
}
