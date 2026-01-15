import { buildDependencyMap, detectCycles, topologicalSort } from '@genfeedai/core';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { ExecutionsService } from '../../executions/executions.service';
import type { WorkflowsService } from '../../workflows/workflows.service';
import type { WorkflowJobData } from '../interfaces/job-data.interface';
import { JOB_STATUS, QUEUE_NAMES } from '../queue.constants';
import type { QueueManagerService } from '../services/queue-manager.service';

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  source: string;
  target: string;
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
    private readonly workflowsService: WorkflowsService
  ) {
    super();
  }

  async process(job: Job<WorkflowJobData>): Promise<void> {
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
