import { beforeEach, vi } from 'vitest';
import {
  mockPredictionCreated,
  mockPredictionSucceeded,
  mockReplicateClient,
} from '@/test/mocks/replicate.mock';

// Mock BullMQ globally to prevent Redis connections in tests
vi.mock('@nestjs/bullmq', () => ({
  BullModule: {
    forRoot: vi.fn().mockReturnValue({ module: class {} }),
    forRootAsync: vi.fn().mockReturnValue({ module: class {} }),
    registerQueue: vi.fn().mockReturnValue({ module: class {} }),
  },
  InjectQueue: () => vi.fn(),
  OnWorkerEvent: () => vi.fn(),
  Processor: () => vi.fn(),
  WorkerHost: class {},
}));

// Mock bullmq directly as well
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(function () {
    return {
      add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
      close: vi.fn().mockResolvedValue(undefined),
      getJob: vi.fn().mockResolvedValue(null),
    };
  }),
  QueueEvents: vi.fn().mockImplementation(function () {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };
  }),
  Worker: vi.fn().mockImplementation(function () {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };
  }),
}));

// Mock Replicate SDK globally - must return the shared mock instance
vi.mock('replicate', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return mockReplicateClient;
    }),
  };
});

// Reset mocks and restore defaults before each test
beforeEach(() => {
  mockReplicateClient.predictions.create.mockReset();
  mockReplicateClient.predictions.get.mockReset();
  mockReplicateClient.predictions.cancel.mockReset();
  mockReplicateClient.run.mockReset();

  // Restore default behaviors
  mockReplicateClient.predictions.create.mockResolvedValue(mockPredictionCreated);
  mockReplicateClient.predictions.get.mockResolvedValue(mockPredictionSucceeded);
  mockReplicateClient.predictions.cancel.mockResolvedValue({ status: 'canceled' });
  mockReplicateClient.run.mockResolvedValue(['Generated text']);
});

// Global test timeout
vi.setConfig({ testTimeout: 30000 });
