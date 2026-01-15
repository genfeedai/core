import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CostCalculatorService } from './cost-calculator.service';
import type { WorkflowNodeForCost } from './interfaces/cost.interface';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCalculatorService],
    }).compile();

    service = module.get<CostCalculatorService>(CostCalculatorService);
  });

  describe('calculateImageCost', () => {
    it('should return correct price for nano-banana model', () => {
      const cost = service.calculateImageCost('nano-banana');
      expect(cost).toBe(0.039);
    });

    it('should return correct price for nano-banana-pro at 2K resolution', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '2K');
      expect(cost).toBe(0.15);
    });

    it('should return correct price for nano-banana-pro at 4K resolution', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '4K');
      expect(cost).toBe(0.3);
    });

    it('should return correct price for nano-banana-pro at 1K resolution', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '1K');
      expect(cost).toBe(0.15);
    });

    it('should return default 2K price for nano-banana-pro without resolution', () => {
      const cost = service.calculateImageCost('nano-banana-pro');
      expect(cost).toBe(0.15);
    });

    it('should return correct price for legacy imagen-4-fast model', () => {
      const cost = service.calculateImageCost('imagen-4-fast');
      expect(cost).toBe(0.039);
    });

    it('should return correct price for legacy imagen-4 model', () => {
      const cost = service.calculateImageCost('imagen-4', '2K');
      expect(cost).toBe(0.15);
    });

    it('should return 0 for unknown model', () => {
      const cost = service.calculateImageCost('unknown-model');
      expect(cost).toBe(0);
    });

    it('should normalize resolution with 4k to 4K', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '4k');
      expect(cost).toBe(0.3);
    });

    it('should normalize resolution with 2160p to 4K', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '2160p');
      expect(cost).toBe(0.3);
    });

    it('should normalize resolution with 720p to 1K', () => {
      const cost = service.calculateImageCost('nano-banana-pro', '720p');
      expect(cost).toBe(0.15);
    });
  });

  describe('calculateVideoCost', () => {
    it('should calculate correct cost for veo-3.1-fast with audio', () => {
      const cost = service.calculateVideoCost('veo-3.1-fast', 8, true);
      expect(cost).toBe(0.15 * 8); // $1.20
    });

    it('should calculate correct cost for veo-3.1-fast without audio', () => {
      const cost = service.calculateVideoCost('veo-3.1-fast', 8, false);
      expect(cost).toBe(0.1 * 8); // $0.80
    });

    it('should calculate correct cost for veo-3.1 with audio', () => {
      const cost = service.calculateVideoCost('veo-3.1', 8, true);
      expect(cost).toBe(0.4 * 8); // $3.20
    });

    it('should calculate correct cost for veo-3.1 without audio', () => {
      const cost = service.calculateVideoCost('veo-3.1', 8, false);
      expect(cost).toBe(0.2 * 8); // $1.60
    });

    it('should handle legacy veo-3-fast model', () => {
      const cost = service.calculateVideoCost('veo-3-fast', 8, true);
      expect(cost).toBe(0.15 * 8);
    });

    it('should handle legacy veo-3 model', () => {
      const cost = service.calculateVideoCost('veo-3', 8, true);
      expect(cost).toBe(0.4 * 8);
    });

    it('should return 0 for unknown video model', () => {
      const cost = service.calculateVideoCost('unknown-model', 8, true);
      expect(cost).toBe(0);
    });

    it('should scale cost based on duration', () => {
      const cost4s = service.calculateVideoCost('veo-3.1-fast', 4, true);
      const cost8s = service.calculateVideoCost('veo-3.1-fast', 8, true);
      expect(cost8s).toBe(cost4s * 2);
    });
  });

  describe('calculateLLMCost', () => {
    it('should calculate cost based on token count', () => {
      const cost = service.calculateLLMCost(1000, 500);
      expect(cost).toBe(1500 * 0.0000095);
    });

    it('should return 0 for 0 tokens', () => {
      const cost = service.calculateLLMCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('calculatePredictionCost', () => {
    it('should calculate image cost for image model', () => {
      const cost = service.calculatePredictionCost('nano-banana-pro', undefined, undefined, '2K');
      expect(cost).toBe(0.15);
    });

    it('should calculate video cost for video model', () => {
      const cost = service.calculatePredictionCost('veo-3.1-fast', 8, true);
      expect(cost).toBe(0.15 * 8);
    });

    it('should use default duration for video model without duration', () => {
      const cost = service.calculatePredictionCost('veo-3.1-fast', undefined, true);
      expect(cost).toBe(0.15 * 8); // Default duration is 8
    });

    it('should use default audio=true for video model without audio param', () => {
      const cost = service.calculatePredictionCost('veo-3.1-fast', 8, undefined);
      expect(cost).toBe(0.15 * 8);
    });

    it('should return 0 for unknown model type', () => {
      const cost = service.calculatePredictionCost('unknown-model');
      expect(cost).toBe(0);
    });
  });

  describe('calculateWorkflowEstimate', () => {
    it('should return empty breakdown for empty nodes', () => {
      const result = service.calculateWorkflowEstimate([]);
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it('should calculate cost for single image gen node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'imageGen',
          data: { model: 'nano-banana-pro', resolution: '2K' },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.15);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].nodeId).toBe('node-1');
      expect(result.breakdown[0].model).toBe('nano-banana-pro');
    });

    it('should calculate cost for video gen node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'videoGen',
          data: { model: 'veo-3.1-fast', duration: 8, generateAudio: true },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.15 * 8);
      expect(result.breakdown[0].duration).toBe(8);
      expect(result.breakdown[0].withAudio).toBe(true);
    });

    it('should calculate total for multiple nodes', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'imageGen',
          data: { model: 'nano-banana-pro', resolution: '2K' },
        },
        {
          id: 'node-2',
          type: 'videoGen',
          data: { model: 'veo-3.1-fast', duration: 8, generateAudio: true },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.15 + 0.15 * 8);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should skip nodes without model', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'prompt',
          data: {},
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it('should handle legacy node type names', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'image-gen',
          data: { model: 'nano-banana' },
        },
        {
          id: 'node-2',
          type: 'ImageGenNode',
          data: { model: 'nano-banana' },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.039 * 2);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should handle video nodes with default values', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'videoGen',
          data: { model: 'veo-3.1-fast' }, // No duration or generateAudio
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      // Should use defaults: 8 seconds, with audio
      expect(result.total).toBe(0.15 * 8);
    });
  });

  describe('buildJobCostBreakdown', () => {
    it('should build cost breakdown object', () => {
      const breakdown = service.buildJobCostBreakdown(
        'nano-banana-pro',
        0.15,
        undefined,
        undefined,
        '2K'
      );

      expect(breakdown).toEqual({
        model: 'nano-banana-pro',
        resolution: '2K',
        duration: undefined,
        withAudio: undefined,
        unitPrice: 0.15,
        quantity: 1,
      });
    });

    it('should include video-specific fields', () => {
      const breakdown = service.buildJobCostBreakdown('veo-3.1-fast', 1.2, 8, true);

      expect(breakdown).toEqual({
        model: 'veo-3.1-fast',
        resolution: undefined,
        duration: 8,
        withAudio: true,
        unitPrice: 1.2,
        quantity: 1,
      });
    });
  });

  describe('calculateLumaReframeCost', () => {
    it('should calculate cost for lumaReframeImage with photon-flash-1 model', () => {
      const cost = service.calculateLumaReframeCost('lumaReframeImage', 'photon-flash-1');
      expect(cost).toBe(0.01);
    });

    it('should calculate cost for lumaReframeImage with photon-1 model', () => {
      const cost = service.calculateLumaReframeCost('lumaReframeImage', 'photon-1');
      expect(cost).toBe(0.03);
    });

    it('should default to photon-flash-1 when no model specified for image', () => {
      const cost = service.calculateLumaReframeCost('lumaReframeImage');
      expect(cost).toBe(0.01);
    });

    it('should calculate cost for lumaReframeVideo based on duration', () => {
      const cost = service.calculateLumaReframeCost('lumaReframeVideo', undefined, 10);
      expect(cost).toBe(10 * 0.06); // $0.60
    });

    it('should default to 5 seconds for video when no duration specified', () => {
      const cost = service.calculateLumaReframeCost('lumaReframeVideo');
      expect(cost).toBe(5 * 0.06); // $0.30
    });

    it('should return 0 for unknown luma node type', () => {
      const cost = service.calculateLumaReframeCost('unknownLumaNode');
      expect(cost).toBe(0);
    });

    it('should scale video cost with longer duration', () => {
      const cost5s = service.calculateLumaReframeCost('lumaReframeVideo', undefined, 5);
      const cost10s = service.calculateLumaReframeCost('lumaReframeVideo', undefined, 10);
      expect(cost10s).toBe(cost5s * 2);
    });
  });

  describe('calculateTopazCost', () => {
    describe('topazImageUpscale', () => {
      it('should calculate cost for 2x upscale (2MP -> 8MP)', () => {
        // Base 2MP * 4 (2x^2) = 8MP -> $0.08 tier
        const cost = service.calculateTopazCost('topazImageUpscale', { upscaleFactor: '2x' });
        expect(cost).toBe(0.08);
      });

      it('should calculate cost for 4x upscale (2MP -> 32MP)', () => {
        // Base 2MP * 16 (4x^2) = 32MP -> highest tier $0.82
        const cost = service.calculateTopazCost('topazImageUpscale', { upscaleFactor: '4x' });
        expect(cost).toBe(0.82);
      });

      it('should calculate cost for 6x upscale (2MP -> 72MP)', () => {
        // Base 2MP * 36 (6x^2) = 72MP -> highest tier $0.82
        const cost = service.calculateTopazCost('topazImageUpscale', { upscaleFactor: '6x' });
        expect(cost).toBe(0.82);
      });

      it('should default to no upscale when factor not specified', () => {
        // Base 2MP * 1 = 2MP -> $0.05 tier
        const cost = service.calculateTopazCost('topazImageUpscale', {});
        expect(cost).toBe(0.05);
      });
    });

    describe('topazVideoUpscale', () => {
      it('should calculate cost for 1080p-30fps 10s video', () => {
        // 10s = 2 segments of 5s, $0.101 per 5s
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          targetResolution: '1080p',
          targetFps: 30,
          duration: 10,
        });
        expect(cost).toBe(2 * 0.101);
      });

      it('should calculate cost for 4k-60fps 15s video', () => {
        // 15s = 3 segments of 5s, $0.747 per 5s
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          targetResolution: '4k',
          targetFps: 60,
          duration: 15,
        });
        expect(cost).toBe(3 * 0.747);
      });

      it('should calculate cost for 720p-24fps 5s video', () => {
        // 5s = 1 segment, $0.022 per 5s
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          targetResolution: '720p',
          targetFps: 24,
          duration: 5,
        });
        expect(cost).toBe(0.022);
      });

      it('should default to 1080p-30 when no resolution/fps specified', () => {
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          duration: 10,
        });
        expect(cost).toBe(2 * 0.101);
      });

      it('should default to 10s duration when not specified', () => {
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          targetResolution: '1080p',
          targetFps: 30,
        });
        expect(cost).toBe(2 * 0.101);
      });

      it('should round up segments for partial durations', () => {
        // 7s = 2 segments (rounded up from 1.4)
        const cost = service.calculateTopazCost('topazVideoUpscale', {
          targetResolution: '1080p',
          targetFps: 30,
          duration: 7,
        });
        expect(cost).toBe(2 * 0.101);
      });
    });

    it('should return 0 for unknown topaz node type', () => {
      const cost = service.calculateTopazCost('unknownTopazNode', {});
      expect(cost).toBe(0);
    });
  });

  describe('calculateWorkflowEstimate with Luma/Topaz nodes', () => {
    it('should calculate cost for lumaReframeImage node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'lumaReframeImage',
          data: { model: 'photon-1' },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.03);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should calculate cost for lumaReframeVideo node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'lumaReframeVideo',
          data: { duration: 8 },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(8 * 0.06);
    });

    it('should calculate cost for topazImageUpscale node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'topazImageUpscale',
          data: { upscaleFactor: '2x' },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(0.08);
    });

    it('should calculate cost for topazVideoUpscale node', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'topazVideoUpscale',
          data: { targetResolution: '4k', targetFps: 30, duration: 10 },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      expect(result.total).toBe(2 * 0.373);
    });

    it('should calculate total for mixed workflow with Luma and Topaz nodes', () => {
      const nodes: WorkflowNodeForCost[] = [
        {
          id: 'node-1',
          type: 'imageGen',
          data: { model: 'nano-banana-pro', resolution: '2K' },
        },
        {
          id: 'node-2',
          type: 'lumaReframeImage',
          data: { model: 'photon-flash-1' },
        },
        {
          id: 'node-3',
          type: 'topazImageUpscale',
          data: { upscaleFactor: '2x' },
        },
      ];

      const result = service.calculateWorkflowEstimate(nodes);

      // $0.15 + $0.01 + $0.08 = $0.24
      expect(result.total).toBe(0.15 + 0.01 + 0.08);
      expect(result.breakdown).toHaveLength(3);
    });
  });
});
