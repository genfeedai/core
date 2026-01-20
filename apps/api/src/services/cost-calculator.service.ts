import type { ImageModel, VideoModel } from '@genfeedai/core';
import {
  DEFAULT_VIDEO_DURATION,
  IMAGE_NODE_TYPES,
  LUMA_NODE_TYPES,
  PRICING,
  TOPAZ_NODE_TYPES,
  VIDEO_NODE_TYPES,
} from '@genfeedai/core';
import { Injectable } from '@nestjs/common';
import type {
  CostBreakdownItem,
  CostEstimate,
  JobCostBreakdown,
  WorkflowNodeForCost,
} from '@/interfaces/cost.interface';

@Injectable()
export class CostCalculatorService {
  /**
   * Calculate estimated cost for a workflow before execution
   */
  calculateWorkflowEstimate(nodes: WorkflowNodeForCost[]): CostEstimate {
    const breakdown: CostBreakdownItem[] = [];
    let total = 0;

    for (const node of nodes) {
      const cost = this.calculateNodeCost(node);
      if (cost > 0) {
        const item: CostBreakdownItem = {
          nodeId: node.id,
          nodeType: node.type,
          model: node.data.model ?? 'unknown',
          unitPrice: this.getUnitPrice(node),
          quantity: 1,
          subtotal: cost,
        };

        // Add video-specific details
        if (this.isVideoNode(node.type)) {
          item.duration = node.data.duration ?? DEFAULT_VIDEO_DURATION;
          item.withAudio = node.data.generateAudio ?? true;
        }

        breakdown.push(item);
        total += cost;
      }
    }

    return { total, breakdown };
  }

  /**
   * Calculate cost for a single workflow node
   */
  private calculateNodeCost(node: WorkflowNodeForCost): number {
    const { type, data } = node;
    const model = data.model;

    // Image generation nodes
    if (this.isImageNode(type)) {
      if (!model) return 0;
      return this.calculateImageCost(model, data.resolution);
    }

    // Video generation nodes
    if (this.isVideoNode(type)) {
      if (!model) return 0;
      const duration = data.duration ?? DEFAULT_VIDEO_DURATION;
      const withAudio = data.generateAudio ?? true;
      return this.calculateVideoCost(model, duration, withAudio);
    }

    // Luma Reframe nodes
    if (this.isLumaNode(type)) {
      return this.calculateLumaReframeCost(type, data.model, data.duration, data.inputType);
    }

    // Topaz Upscale nodes
    if (this.isTopazNode(type)) {
      return this.calculateTopazCost(type, data as unknown as Record<string, unknown>);
    }

    return 0;
  }

  /**
   * Calculate actual cost for a completed prediction
   */
  calculatePredictionCost(
    model: string,
    duration?: number,
    withAudio?: boolean,
    resolution?: string
  ): number {
    // Image models
    if (this.isImageModel(model)) {
      return this.calculateImageCost(model, resolution);
    }

    // Video models
    if (this.isVideoModel(model)) {
      return this.calculateVideoCost(model, duration ?? DEFAULT_VIDEO_DURATION, withAudio ?? true);
    }

    return 0;
  }

  /**
   * Calculate image generation cost
   */
  calculateImageCost(model: string, resolution?: string): number {
    // nano-banana (flat rate)
    if (model === 'nano-banana' || model === 'imagen-4-fast') {
      return PRICING['nano-banana'];
    }

    // nano-banana-pro (resolution-based)
    if (model === 'nano-banana-pro' || model === 'imagen-4') {
      const pricing = PRICING['nano-banana-pro'];
      const resKey = this.normalizeResolution(resolution);
      return pricing[resKey as keyof typeof pricing] ?? pricing['2K'];
    }

    return 0;
  }

  /**
   * Calculate video generation cost
   */
  calculateVideoCost(model: string, duration: number, withAudio: boolean): number {
    const pricing = PRICING[model as VideoModel];
    if (!pricing || typeof pricing === 'number') {
      return 0;
    }

    const perSecond = withAudio ? pricing.withAudio : pricing.withoutAudio;
    return perSecond * duration;
  }

  /**
   * Check if model is an image model
   */
  private isImageModel(model: string): model is ImageModel {
    return ['nano-banana', 'nano-banana-pro', 'imagen-4-fast', 'imagen-4'].includes(model);
  }

  /**
   * Check if model is a video model
   */
  private isVideoModel(model: string): model is VideoModel {
    return ['veo-3.1-fast', 'veo-3.1', 'veo-3-fast', 'veo-3'].includes(model);
  }

  /**
   * Normalize resolution string to pricing key
   */
  private normalizeResolution(resolution?: string): string {
    if (!resolution) return '2K';
    const upper = resolution.toUpperCase();
    if (upper.includes('4K') || upper.includes('2160')) return '4K';
    if (upper.includes('1K') || upper.includes('720')) return '1K';
    return '2K';
  }

  /**
   * Calculate LLM cost based on token count
   */
  calculateLLMCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens + outputTokens) * PRICING.llama;
  }

  /**
   * Calculate Luma Reframe cost (unified node)
   */
  calculateLumaReframeCost(
    nodeType: string,
    model?: string,
    videoDuration?: number,
    inputType?: string
  ): number {
    // For unified 'reframe' node, check inputType
    if (nodeType === 'reframe') {
      if (inputType === 'video') {
        const duration = videoDuration ?? 5;
        return duration * PRICING['luma-reframe-video'];
      }
      // Default to image
      const pricing = PRICING['luma-reframe-image'];
      const modelKey = (model ?? 'photon-flash-1') as keyof typeof pricing;
      return pricing[modelKey] ?? pricing['photon-flash-1'];
    }

    return 0;
  }

  /**
   * Calculate Topaz Upscale cost (unified node)
   */
  calculateTopazCost(nodeType: string, data: Record<string, unknown>): number {
    if (nodeType === 'upscale') {
      const inputType = data.inputType as string;
      if (inputType === 'video') {
        const resolution = (data.targetResolution as string) ?? '1080p';
        const fps = (data.targetFps as number) ?? 30;
        const duration = (data.duration as number) ?? 10;
        return this.calculateTopazVideoCost(resolution, fps, duration);
      }
      // Default to image
      const baseMP = 2;
      const factor = this.getUpscaleMultiplier(data.upscaleFactor as string);
      const outputMP = baseMP * factor;
      return this.calculateTopazImageCost(outputMP);
    }

    return 0;
  }

  /**
   * Calculate Topaz image upscale cost based on output megapixels
   */
  private calculateTopazImageCost(outputMegapixels: number): number {
    const tiers = PRICING['topaz-image-upscale'];
    for (const tier of tiers) {
      if (outputMegapixels <= tier.maxMP) {
        return tier.price;
      }
    }
    return tiers[tiers.length - 1].price;
  }

  /**
   * Calculate Topaz video upscale cost
   */
  private calculateTopazVideoCost(
    resolution: string,
    fps: number,
    durationSeconds: number
  ): number {
    const pricing = PRICING['topaz-video-upscale'];
    const key = `${resolution}-${fps}` as keyof typeof pricing;
    const perFiveSeconds = pricing[key] ?? pricing['1080p-30'];
    const segments = Math.ceil(durationSeconds / 5);
    return segments * perFiveSeconds;
  }

  /**
   * Get upscale multiplier for Topaz
   */
  private getUpscaleMultiplier(factor?: string): number {
    switch (factor) {
      case '2x':
        return 4;
      case '4x':
        return 16;
      case '6x':
        return 36;
      default:
        return 1;
    }
  }

  /**
   * Check if node type is a Luma reframe node
   */
  private isLumaNode(type: string): boolean {
    return (LUMA_NODE_TYPES as readonly string[]).includes(type);
  }

  /**
   * Check if node type is a Topaz upscale node
   */
  private isTopazNode(type: string): boolean {
    return (TOPAZ_NODE_TYPES as readonly string[]).includes(type);
  }

  /**
   * Get unit price for a node (for display purposes)
   */
  private getUnitPrice(node: WorkflowNodeForCost): number {
    const model = node.data.model;
    if (!model) {
      return 0;
    }

    // Image models - flat rate
    if (model === 'nano-banana' || model === 'imagen-4-fast') {
      return PRICING['nano-banana'];
    }

    // Image models - resolution-based
    if (model === 'nano-banana-pro' || model === 'imagen-4') {
      const pricing = PRICING['nano-banana-pro'];
      const resKey = this.normalizeResolution(node.data.resolution);
      return pricing[resKey as keyof typeof pricing] ?? pricing['2K'];
    }

    // Video models return per-second price
    if (this.isVideoModel(model)) {
      const pricing = PRICING[model as VideoModel];
      if (pricing && typeof pricing !== 'number') {
        const withAudio = node.data.generateAudio ?? true;
        return withAudio ? pricing.withAudio : pricing.withoutAudio;
      }
    }

    return 0;
  }

  /**
   * Build cost breakdown object for storing on job
   */
  buildJobCostBreakdown(
    model: string,
    cost: number,
    duration?: number,
    withAudio?: boolean,
    resolution?: string
  ): JobCostBreakdown {
    return {
      model,
      resolution,
      duration,
      withAudio,
      unitPrice: cost,
      quantity: 1,
    };
  }

  /**
   * Check if node type is an image generation node
   */
  private isImageNode(type: string): boolean {
    return (IMAGE_NODE_TYPES as readonly string[]).includes(type);
  }

  /**
   * Check if node type is a video generation node
   */
  private isVideoNode(type: string): boolean {
    return (VIDEO_NODE_TYPES as readonly string[]).includes(type);
  }
}
