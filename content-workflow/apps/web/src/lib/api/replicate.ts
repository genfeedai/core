import { apiClient } from "./client";

export interface ImageGenerationInput {
  executionId: string;
  nodeId: string;
  model: "nano-banana" | "nano-banana-pro";
  prompt: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
}

export interface VideoGenerationInput {
  executionId: string;
  nodeId: string;
  model: "veo-3.1-fast" | "veo-3.1";
  prompt: string;
  image?: string;
  lastFrame?: string;
  referenceImages?: string[];
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
  seed?: number;
}

export interface LLMInput {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface PredictionResponse {
  predictionId: string;
  status: string;
}

export interface PredictionStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error?: string;
}

export interface LLMResponse {
  output: string;
  status: string;
}

export const replicateApi = {
  /**
   * Generate an image using nano-banana models
   */
  generateImage: (input: ImageGenerationInput, signal?: AbortSignal): Promise<PredictionResponse> =>
    apiClient.post<PredictionResponse>("/replicate/image", input, { signal }),

  /**
   * Generate a video using veo models
   */
  generateVideo: (input: VideoGenerationInput, signal?: AbortSignal): Promise<PredictionResponse> =>
    apiClient.post<PredictionResponse>("/replicate/video", input, { signal }),

  /**
   * Generate text using LLM
   */
  generateText: (input: LLMInput, signal?: AbortSignal): Promise<LLMResponse> =>
    apiClient.post<LLMResponse>("/replicate/llm", input, { signal }),

  /**
   * Get prediction status
   */
  getPredictionStatus: (predictionId: string, signal?: AbortSignal): Promise<PredictionStatus> =>
    apiClient.get<PredictionStatus>(`/replicate/predictions/${predictionId}`, { signal }),

  /**
   * Cancel a prediction
   */
  cancelPrediction: (predictionId: string, signal?: AbortSignal): Promise<{ cancelled: boolean }> =>
    apiClient.post<{ cancelled: boolean }>(`/replicate/predictions/${predictionId}/cancel`, undefined, { signal }),
};
