import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OllamaGenerateInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama service for local LLM inference
 * Enables fully self-hosted workflows without external API costs
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('OLLAMA_DEFAULT_MODEL', 'llama3.1');
    this.enabled = this.configService.get<boolean>('OLLAMA_ENABLED', false);
  }

  /**
   * Check if Ollama integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if Ollama server is reachable
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models from Ollama
   */
  async listModels(): Promise<string[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as { models: Array<{ name: string }> };
      return data.models.map((m) => m.name);
    } catch (error) {
      this.logger.error('Failed to list Ollama models', error);
      return [];
    }
  }

  /**
   * Generate text using Ollama
   */
  async generateText(input: OllamaGenerateInput): Promise<string> {
    if (!this.enabled) {
      throw new Error('Ollama is not enabled. Set OLLAMA_ENABLED=true in environment.');
    }

    const model = input.model ?? this.defaultModel;

    this.logger.log(`Generating text with Ollama model: ${model}`);

    // Build the prompt with optional system prompt
    let fullPrompt = input.prompt;
    if (input.systemPrompt) {
      fullPrompt = `${input.systemPrompt}\n\n${input.prompt}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        body: JSON.stringify({
          model,
          options: {
            num_predict: input.maxTokens ?? 2048,
            temperature: input.temperature ?? 0.7,
            top_p: input.topP ?? 0.9,
          },
          prompt: fullPrompt,
          stream: false,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OllamaResponse;
      this.logger.log(`Ollama generation complete: ${data.eval_count ?? 0} tokens generated`);

      return data.response;
    } catch (error) {
      this.logger.error('Ollama generation failed', error);
      throw error;
    }
  }

  /**
   * Generate text with streaming (for future use with SSE)
   */
  async *generateTextStream(input: OllamaGenerateInput): AsyncGenerator<string> {
    if (!this.enabled) {
      throw new Error('Ollama is not enabled. Set OLLAMA_ENABLED=true in environment.');
    }

    const model = input.model ?? this.defaultModel;

    let fullPrompt = input.prompt;
    if (input.systemPrompt) {
      fullPrompt = `${input.systemPrompt}\n\n${input.prompt}`;
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      body: JSON.stringify({
        model,
        options: {
          num_predict: input.maxTokens ?? 2048,
          temperature: input.temperature ?? 0.7,
          top_p: input.topP ?? 0.9,
        },
        prompt: fullPrompt,
        stream: true,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          const data = JSON.parse(line) as OllamaResponse;
          if (data.response) {
            yield data.response;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
