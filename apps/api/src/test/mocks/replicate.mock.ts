import { vi } from 'vitest';

// Mock Replicate SDK responses
export const mockReplicateClient = {
  predictions: {
    cancel: vi.fn().mockResolvedValue({ status: 'canceled' }),
    create: vi.fn().mockResolvedValue({
      id: 'mock-prediction-id',
      status: 'starting',
      urls: { get: 'https://api.replicate.com/v1/predictions/mock-prediction-id' },
    }),
    get: vi.fn().mockResolvedValue({
      id: 'mock-prediction-id',
      output: ['https://replicate.delivery/mock-output.png'],
      status: 'succeeded',
    }),
  },
  run: vi.fn().mockResolvedValue(['Generated text response from mock LLM']),
};

// Mock responses per model type
export const mockImageGenResponse = {
  id: 'img-prediction-123',
  metrics: { predict_time: 2.5 },
  output: ['https://replicate.delivery/mock-image.png'],
  status: 'succeeded',
};

export const mockVideoGenResponse = {
  id: 'vid-prediction-456',
  metrics: { predict_time: 15.2 },
  output: 'https://replicate.delivery/mock-video.mp4',
  status: 'succeeded',
};

export const mockLLMResponse = {
  id: 'llm-prediction-789',
  metrics: { input_token_count: 50, output_token_count: 100 },
  output: ['Generated text response from mock LLM'],
  status: 'succeeded',
};

// Mock prediction creation response
export const mockPredictionCreated = {
  id: 'mock-prediction-id',
  status: 'starting',
  urls: { get: 'https://api.replicate.com/v1/predictions/mock-prediction-id' },
};

// Mock prediction status response
export const mockPredictionSucceeded = {
  id: 'mock-prediction-id',
  metrics: { predict_time: 5.0 },
  output: ['https://replicate.delivery/mock-output.png'],
  status: 'succeeded',
};

export const mockPredictionFailed = {
  error: 'Mock error: Model failed to generate output',
  id: 'mock-prediction-id',
  status: 'failed',
};

export const mockPredictionCanceled = {
  id: 'mock-prediction-id',
  status: 'canceled',
};

// Helper to create Replicate SDK mock
export function createReplicateMock() {
  return {
    default: vi.fn().mockImplementation(function replicateConstructor(this: unknown) {
      return mockReplicateClient;
    }),
  };
}

// Reset all mocks
export function resetReplicateMocks() {
  mockReplicateClient.predictions.create.mockClear();
  mockReplicateClient.predictions.get.mockClear();
  mockReplicateClient.predictions.cancel.mockClear();
  mockReplicateClient.run.mockClear();
}
