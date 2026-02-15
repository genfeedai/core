import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, type OnModuleInit, Param, Post, Query } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@/queue/queue.constants';
import { JobRecoveryService } from '@/services/job-recovery.service';
import { QueueManagerService } from '@/services/queue-manager.service';

/**
 * Controller for queue management and Bull Board dashboard
 *
 * Note: For production, protect these endpoints with authentication.
 * Example: Add @UseGuards(AdminAuthGuard) decorator
 */
@Controller('admin/queues')
export class BullBoardController implements OnModuleInit {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue(QUEUE_NAMES.WORKFLOW_ORCHESTRATOR)
    private readonly workflowQueue: Queue,
    @InjectQueue(QUEUE_NAMES.IMAGE_GENERATION)
    private readonly imageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VIDEO_GENERATION)
    private readonly videoQueue: Queue,
    @InjectQueue(QUEUE_NAMES.LLM_GENERATION)
    private readonly llmQueue: Queue,
    private readonly queueManager: QueueManagerService,
    private readonly jobRecoveryService: JobRecoveryService
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues/board');
  }

  onModuleInit(): void {
    createBullBoard({
      queues: [
        new BullMQAdapter(this.workflowQueue),
        new BullMQAdapter(this.imageQueue),
        new BullMQAdapter(this.videoQueue),
        new BullMQAdapter(this.llmQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Get Bull Board Express adapter (for mounting)
   */
  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter;
  }

  /**
   * Get queue metrics summary
   */
  @Get('metrics')
  async getMetrics(): Promise<{
    queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>;
    jobs: {
      total: number;
      pending: number;
      active: number;
      completed: number;
      failed: number;
      recovered: number;
      inDlq: number;
    };
  }> {
    const [queues, jobs] = await Promise.all([
      this.queueManager.getQueueMetrics(),
      this.jobRecoveryService.getJobStats(),
    ]);

    return { jobs, queues };
  }

  /**
   * Get jobs for a specific execution
   */
  @Get('executions/:executionId/jobs')
  async getExecutionJobs(@Param('executionId') executionId: string): Promise<{
    jobs: Array<{
      bullJobId: string;
      queueName: string;
      nodeId: string;
      status: string;
      error?: string;
      createdAt: Date;
      finishedAt?: Date;
    }>;
  }> {
    const jobs = await this.queueManager.getExecutionJobs(executionId);

    return {
      jobs: jobs.map((job) => ({
        bullJobId: job.bullJobId,
        createdAt: job.createdAt,
        error: job.error,
        finishedAt: job.finishedAt,
        nodeId: job.nodeId,
        queueName: job.queueName,
        status: job.status,
      })),
    };
  }

  /**
   * Get dead letter queue jobs
   */
  @Get('dlq')
  async getDlqJobs(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0'
  ): Promise<{
    jobs: Array<{
      bullJobId: string;
      queueName: string;
      nodeId: string;
      error?: string;
      attemptsMade: number;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { jobs, total } = await this.jobRecoveryService.getDlqJobs(
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    return {
      jobs: jobs.map((job) => ({
        attemptsMade: job.attemptsMade,
        bullJobId: job.bullJobId,
        createdAt: job.createdAt,
        error: job.error,
        nodeId: job.nodeId,
        queueName: job.queueName,
      })),
      total,
    };
  }

  /**
   * Retry a job from DLQ
   */
  @Post('dlq/:jobId/retry')
  async retryDlqJob(
    @Param('jobId') jobId: string
  ): Promise<{ success: boolean; newJobId: string }> {
    const newJobId = await this.jobRecoveryService.retryFromDlq(jobId);
    return { newJobId, success: true };
  }

  /**
   * Recover stalled jobs manually
   */
  @Post('recover')
  async recoverStalledJobs(): Promise<{ recoveredCount: number }> {
    const recoveredCount = await this.jobRecoveryService.recoverStalledJobs();
    return { recoveredCount };
  }

  /**
   * Recover a specific execution's jobs
   */
  @Post('executions/:executionId/recover')
  async recoverExecutionJobs(
    @Param('executionId') executionId: string
  ): Promise<{ recoveredCount: number }> {
    const recoveredCount = await this.jobRecoveryService.recoverExecution(executionId);
    return { recoveredCount };
  }
}
