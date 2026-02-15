import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger, Optional } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { NodeOutput } from '@/interfaces/execution-types.interface';
import type { JobResult, LLMJobData } from '@/interfaces/job-data.interface';
import { BaseProcessor } from '@/processors/base.processor';
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
  protected readonly queueName = QUEUE_NAMES.LLM_GENERATION;

  constructor(
    @Inject(forwardRef(() => 'QueueManagerService'))
    protected readonly queueManager: QueueManagerService,
    @Inject(forwardRef(() => 'ExecutionsService'))
    protected readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => 'ReplicateService'))
    private readonly replicateService: ReplicateService,
    @Optional()
    @Inject(forwardRef(() => 'OllamaService'))
    private readonly ollamaService?: OllamaService
  ) {
    super();
  }

  async process(job: Job<LLMJobData>): Promise<JobResult> {
    const { executionId, nodeId, nodeData } = job.data;

    this.logger.log(`Processing LLM generation job: ${job.id} for node ${nodeId}`);

    try {
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.ACTIVE);
      await this.executionsService.updateNodeResult(executionId, nodeId, 'processing');
      await job.updateProgress({ message: 'Starting LLM generation', percent: 20 });
      await this.queueManager.addJobLog(job.id as string, 'Starting LLM generation');

      const resolvedPrompt = nodeData.inputPrompt ?? nodeData.prompt;

      if (!resolvedPrompt) {
        throw new Error('No prompt provided: both inputPrompt and prompt are empty');
      }

      const provider = nodeData.provider ?? 'replicate';
      let text: string;

      if (provider === 'ollama' && this.ollamaService?.isEnabled()) {
        this.logger.log(`Using Ollama provider with model: ${nodeData.ollamaModel ?? 'default'}`);
        text = await this.ollamaService.generateText({
          maxTokens: nodeData.maxTokens,
          model: nodeData.ollamaModel,
          prompt: resolvedPrompt,
          systemPrompt: nodeData.systemPrompt,
          temperature: nodeData.temperature,
          topP: nodeData.topP,
        });
      } else {
        text = await this.replicateService.generateText({
          maxTokens: nodeData.maxTokens,
          prompt: resolvedPrompt,
          schemaParams: nodeData.schemaParams,
          selectedModel: nodeData.selectedModel,
          systemPrompt: nodeData.systemPrompt,
          temperature: nodeData.temperature,
          topP: nodeData.topP,
        });
      }

      await job.updateProgress({ message: 'Text generated', percent: 90 });

      const result: JobResult = {
        output: { text },
        success: true,
      };

      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', { text });
      await this.queueManager.updateJobStatus(job.id as string, JOB_STATUS.COMPLETED, {
        result: result as unknown as NodeOutput,
      });

      await job.updateProgress({ message: 'Completed', percent: 100 });
      await this.queueManager.addJobLog(job.id as string, 'LLM generation completed');

      await this.queueManager.continueExecution(executionId, job.data.workflowId);

      return result;
    } catch (error) {
      return this.handleProcessorError(job, error as Error);
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
