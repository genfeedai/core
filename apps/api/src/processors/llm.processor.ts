import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger, Optional } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { JobResult, LLMJobData } from '@/interfaces/job-data.interface';
import { BaseProcessor, type ProcessorErrorContext } from '@/processors/base.processor';
import { JOB_STATUS, QUEUE_CONCURRENCY, QUEUE_NAMES } from '@/queue/queue.constants';
import type { ExecutionsService } from '@/services/executions.service';
import type { OllamaService } from '@/services/ollama.service';
import type { QueueManagerService } from '@/services/queue-manager.service';
import type { ReplicateService } from '@/services/replicate.service';

@Processor(QUEUE_NAMES.LLM_GENERATION, {
  concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.LLM_GENERATION],
})
export class LLMProcessor extends BaseProcessor<LLMJobData> {
  protected readonly logger = new Logger(LLMProcessor.name);

  private readonly errorContext: ProcessorErrorContext;

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    private readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Optional()
    @Inject(forwardRef(() => 'OllamaService'))
    private readonly ollamaService?: OllamaService
  ) {
    super();
    this.errorContext = {
      queueManager: this.queueManager,
      executionsService: this.executionsService,
      queueName: QUEUE_NAMES.LLM_GENERATION,
    };
  }

  async process(job: Job<LLMJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    this.logger.log(`Processing LLM generation job: ${job.id} for node ${nodeId}`);

    try {
      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);

      // Update node status in execution
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');

      // Update progress
      await job.updateProgress({ percent: 20, message: 'Starting LLM generation' });
      await this.queueManager.addJobLog(job.id as string, 'Starting LLM generation');

      // Determine which provider to use
      const provider = nodeData.provider ?? 'replicate';
      let text: string;

      if (provider === 'ollama' && this.ollamaService?.isEnabled()) {
        // Use Ollama for local LLM inference
        this.logger.log(`Using Ollama provider with model: ${nodeData.ollamaModel ?? 'default'}`);
        text = await this.ollamaService.generateText({
          prompt: nodeData.prompt,
          systemPrompt: nodeData.systemPrompt,
          model: nodeData.ollamaModel,
          maxTokens: nodeData.maxTokens,
          temperature: nodeData.temperature,
          topP: nodeData.topP,
        });
      } else {
        // Use Replicate (default)
        text = await this.replicateService.generateText({
          prompt: nodeData.prompt,
          systemPrompt: nodeData.systemPrompt,
          maxTokens: nodeData.maxTokens,
          temperature: nodeData.temperature,
          topP: nodeData.topP,
        });
      }

      await job.updateProgress({ percent: 90, message: 'Text generated' });

      const result: JobResult = {
        success: true,
        output: { text },
      };

      // Update execution node result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', { text });

      // Update job status
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as Record<string, unknown>,
      });

      await job.updateProgress({ percent: 100, message: 'Completed' });
      await this.queueManager.addJobLog(job.id as string, 'LLM generation completed');

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error, this.errorContext);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<LLMJobData>): void {
    this.logJobCompleted(job, 'LLM');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<LLMJobData>, error: Error): void {
    this.logJobFailed(job, error, 'LLM');
  }
}
