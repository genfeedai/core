import { buildDependencyMap, detectCycles, topologicalSort } from '@genfeedai/core';
import type { WorkflowInputNodeData, WorkflowOutputNodeData } from '@genfeedai/types';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { WorkflowJobData, WorkflowRefJobData } from '@/interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import type { WorkflowsService } from '@/services/workflows.service';

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

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
   * Process a workflow orchestration job - enqueues all nodes for execution
   */
  private async processWorkflowOrchestration(job: Job<WorkflowJobData>): Promise<void> {
    const { executionId, workflowId } = job.data;

    this.logger.log(`Processing workflow execution: ${executionId}`);

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

      // Enqueue each node in order
      for (const nodeId of executionOrder) {
        const node = (workflow.nodes as WorkflowNode[]).find((n) => n.id === nodeId);
        if (!node) continue;

        const dependsOn = dependencyMap.get(nodeId) ?? [];

        await this.queueManager.enqueueNode(
          executionId,
          workflowId,
          node.id,
          node.type,
          node.data,
          dependsOn
        );

        this.logger.log(
          `Enqueued node ${nodeId} (${node.type}) with dependencies: [${dependsOn.join(', ')}]`
        );
      }

      // Update job status to completed
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
          childDependsOn
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
        outputMappings: childOutputs,
        childExecutionId: childExecutionId.toString(),
      });

      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: { outputMappings: childOutputs, childExecutionId: childExecutionId.toString() },
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
      const childExecution = await this.executionsService.getExecution(childExecutionId);

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
