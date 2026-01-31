import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

// Mock webhook store
vi.mock('@/lib/replicate/webhook-store', () => ({
  setWebhookResult: vi.fn(),
}));

import { setWebhookResult } from '@/lib/replicate/webhook-store';

describe('POST /api/replicate/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store successful webhook result', async () => {
    const body = {
      id: 'pred-123',
      status: 'succeeded',
      output: ['https://example.com/image.png'],
      error: null,
    };

    const request = new NextRequest('http://localhost/api/replicate/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.received).toBe(true);
    expect(setWebhookResult as any).toHaveBeenCalledWith('pred-123', {
      status: 'succeeded',
      output: ['https://example.com/image.png'],
      error: null,
    });
  });

  it('should store failed webhook result', async () => {
    const body = {
      id: 'pred-456',
      status: 'failed',
      output: null,
      error: 'Model error: Out of memory',
    };

    const request = new NextRequest('http://localhost/api/replicate/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.received).toBe(true);
    expect(setWebhookResult as any).toHaveBeenCalledWith('pred-456', {
      status: 'failed',
      output: null,
      error: 'Model error: Out of memory',
    });
  });

  it('should handle processing status', async () => {
    const body = {
      id: 'pred-789',
      status: 'processing',
      output: null,
      error: null,
    };

    const request = new NextRequest('http://localhost/api/replicate/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(setWebhookResult as any).toHaveBeenCalledWith('pred-789', {
      status: 'processing',
      output: null,
      error: null,
    });
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/replicate/webhook', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Webhook processing failed');
  });

  it('should handle missing required fields gracefully', async () => {
    const body = {
      id: 'pred-empty',
      status: 'succeeded',
      // output and error intentionally missing
    };

    const request = new NextRequest('http://localhost/api/replicate/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.received).toBe(true);
    expect(setWebhookResult as any).toHaveBeenCalledWith('pred-empty', {
      status: 'succeeded',
      output: undefined,
      error: undefined,
    });
  });
});
