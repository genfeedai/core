import { Injectable, Logger } from '@nestjs/common';
import type { BaseOutputNode } from './base-output-node';

@Injectable()
export class DistributionNodeRegistry {
  private readonly logger = new Logger(DistributionNodeRegistry.name);
  private readonly nodes = new Map<string, { node: BaseOutputNode; platform: string }>();

  register(nodeType: string, platform: string, node: BaseOutputNode): void {
    this.nodes.set(nodeType, { node, platform });
    this.logger.log(`Registered distribution node: ${nodeType} → ${platform}`);
  }

  get(nodeType: string): { node: BaseOutputNode; platform: string } | null {
    return this.nodes.get(nodeType) ?? null;
  }

  getRegisteredTypes(): string[] {
    return [...this.nodes.keys()];
  }
}
