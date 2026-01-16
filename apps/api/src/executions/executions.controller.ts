import { Body, Controller, forwardRef, Get, Inject, Param, Post, Sse } from '@nestjs/common';
import { from, interval, map, Observable, startWith, switchMap, takeWhile } from 'rxjs';
import type { ExecutionCostDetails } from '../cost/interfaces/cost.interface';
import { QueueManagerService } from '../queue/services/queue-manager.service';
import { ExecutionsService } from './executions.service';

interface SseMessage {
  data: string;
}

@Controller()
export class ExecutionsController {
  constructor(
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => QueueManagerService))
    private readonly queueManager: QueueManagerService
  ) {}

  @Post('workflows/:workflowId/execute')
  async createExecution(@Param('workflowId') workflowId: string) {
    // Create execution record
    const execution = await this.executionsService.createExecution(workflowId);
    const executionId = execution._id?.toString() ?? execution.id;

    // Enqueue the workflow for processing
    await this.queueManager.enqueueWorkflow(executionId, workflowId);

    return execution;
  }

  /**
   * SSE endpoint for real-time execution status updates
   */
  @Sse('executions/:id/stream')
  streamExecution(@Param('id') id: string): Observable<SseMessage> {
    // Poll every 1 second and emit status until execution completes
    return interval(1000).pipe(
      startWith(0),
      switchMap(() => from(this.getExecutionWithJobs(id))),
      map((data) => ({ data: JSON.stringify(data) })),
      takeWhile((msg) => {
        const data = JSON.parse(msg.data);
        return !['completed', 'failed', 'cancelled'].includes(data.status);
      }, true)
    );
  }

  private async getExecutionWithJobs(id: string) {
    const execution = await this.executionsService.findExecution(id);
    const jobs = await this.executionsService.findJobsByExecution(id);
    return {
      ...execution.toObject(),
      jobs: jobs.map((j) => j.toObject()),
    };
  }

  @Get('workflows/:workflowId/executions')
  findByWorkflow(@Param('workflowId') workflowId: string) {
    return this.executionsService.findExecutionsByWorkflow(workflowId);
  }

  @Get('executions/:id')
  findOne(@Param('id') id: string) {
    return this.executionsService.findExecution(id);
  }

  @Post('executions/:id/stop')
  stopExecution(@Param('id') id: string) {
    return this.executionsService.updateExecutionStatus(id, 'cancelled');
  }

  @Get('executions/:executionId/jobs')
  findJobsByExecution(@Param('executionId') executionId: string) {
    return this.executionsService.findJobsByExecution(executionId);
  }

  @Get('jobs/:predictionId')
  findJobByPredictionId(@Param('predictionId') predictionId: string) {
    return this.executionsService.findJobByPredictionId(predictionId);
  }

  @Post('jobs/:predictionId/update')
  updateJob(
    @Param('predictionId') predictionId: string,
    @Body() updates: {
      status?: string;
      progress?: number;
      output?: Record<string, unknown>;
      error?: string;
    }
  ) {
    return this.executionsService.updateJob(predictionId, updates);
  }

  @Get('executions/:id/costs')
  async getExecutionCosts(@Param('id') id: string): Promise<ExecutionCostDetails> {
    return this.executionsService.getExecutionCostDetails(id);
  }
}
