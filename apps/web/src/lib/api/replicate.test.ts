import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { replicateApi } from './replicate';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

describe('replicateApi', () => {
  describe('generateImage', () => {
    it('should call correct endpoint with params', async () => {
      const result = await replicateApi.generateImage({
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'nano-banana',
        prompt: 'A beautiful sunset',
        aspectRatio: '16:9',
      });

      expect(result).toBeDefined();
      expect(result.predictionId).toBe('mock-img-id');
      expect(result.status).toBe('starting');
    });

    it('should pass image input when provided', async () => {
      const result = await replicateApi.generateImage({
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'nano-banana-pro',
        prompt: 'Enhanced image',
        imageInput: ['https://example.com/input.png'],
        resolution: '4K',
      });

      expect(result).toBeDefined();
      expect(result.predictionId).toBeDefined();
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        replicateApi.generateImage(
          {
            executionId: 'execution-123',
            nodeId: 'node-1',
            model: 'nano-banana',
            prompt: 'Test',
          },
          controller.signal
        )
      ).rejects.toThrow();
    });
  });

  describe('generateVideo', () => {
    it('should call correct endpoint with params', async () => {
      const result = await replicateApi.generateVideo({
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'veo-3.1-fast',
        prompt: 'A dancing cat',
        duration: 5,
      });

      expect(result).toBeDefined();
      expect(result.predictionId).toBe('mock-vid-id');
    });

    it('should pass all video options', async () => {
      const result = await replicateApi.generateVideo({
        executionId: 'execution-123',
        nodeId: 'node-1',
        model: 'veo-3.1',
        prompt: 'Cinematic video',
        image: 'https://example.com/start.png',
        duration: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('generateText', () => {
    it('should call correct endpoint with params', async () => {
      const result = await replicateApi.generateText({
        prompt: 'Write a haiku',
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.status).toBe('succeeded');
    });

    it('should pass LLM parameters', async () => {
      const result = await replicateApi.generateText({
        prompt: 'Test prompt',
        systemPrompt: 'You are a helpful assistant',
        maxTokens: 500,
        temperature: 0.8,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getPredictionStatus', () => {
    it('should fetch prediction status', async () => {
      const result = await replicateApi.getPredictionStatus('prediction-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('prediction-123');
      expect(result.status).toBe('succeeded');
      expect(result.output).toBeDefined();
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        replicateApi.getPredictionStatus('prediction-123', controller.signal)
      ).rejects.toThrow();
    });
  });

  describe('cancelPrediction', () => {
    it('should send cancel request', async () => {
      const result = await replicateApi.cancelPrediction('prediction-123');

      expect(result).toBeDefined();
      expect(result.cancelled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw on API error', async () => {
      server.use(
        http.post(`${API_BASE_URL}/replicate/image`, () => {
          return HttpResponse.json({ message: 'Invalid model' }, { status: 400 });
        })
      );

      await expect(
        replicateApi.generateImage({
          executionId: 'execution-123',
          nodeId: 'node-1',
          model: 'nano-banana',
          prompt: 'Test',
        })
      ).rejects.toThrow();
    });
  });
});
