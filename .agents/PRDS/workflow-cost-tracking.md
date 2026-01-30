# PRD: Workflow Cost Tracking & Analytics

**Status:** Done (Phase 1 MVP)
**Priority:** High
**Feature ID:** COST-TRACKING

---

## Executive Summary

Implement comprehensive cost tracking for workflow executions, inspired by [node-banana](https://github.com/VincentShipsIt/node-banana)'s approach. Track both **estimated costs** (pre-execution) and **actual costs** (post-execution) for all Replicate API predictions, enabling users to understand and optimize their workflow spending.

---

## Background & Research

### Node-Banana Approach
Node-banana implements cost tracking with:
- `costCalculator.ts` - Calculates costs based on model and resolution using predefined pricing
- `WorkflowCostData` interface storing `workflowId`, `incurredCost`, `lastUpdated`
- Predictive cost calculation before execution via `calculatePredictedCost()`
- Real-time cost accumulation during execution via `addIncurredCost()`
- Per-workflow cost persistence

### Replicate API Cost Data
Replicate's prediction response includes a `metrics` object:
```json
{
  "metrics": {
    "predict_time": 58.5,
    "total_time": 60.0
  }
}
```

**Key limitation:** The API does not return hardware info or direct cost. For **official models** (Imagen 4, Veo 3, etc.), pricing is **per output** (per image, per video second) rather than per compute second.

### Verified Replicate Pricing (Jan 2026)

| Model | Type | Price | Notes |
|-------|------|-------|-------|
| `google/nano-banana` | Image | **$0.039/image** | Fast generation |
| `google/nano-banana-pro` | Image | **$0.15/image** (1K/2K), **$0.30/image** (4K) | High quality, resolution tiers |
| `google/veo-3.1-fast` | Video | **$0.10/sec** (no audio) | Fast generation |
| `google/veo-3.1-fast` | Video | **$0.15/sec** (with audio) | Fast + audio |
| `google/veo-3.1` | Video | **$0.20/sec** (no audio) | High quality |
| `google/veo-3.1` | Video | **$0.40/sec** (with audio) | High quality + audio |
| `meta/meta-llama-3.1-405b-instruct` | LLM | **$9.50/M tokens** | ~$0.0000095/token |

**Note:** `nano-banana-pro` has resolution-based pricing (1K/2K same price, 4K double).

### Current State in Our Codebase
- `PRICING` constants updated in `replicate.service.ts` with correct values
- `cost` field exists on `Job` and `NodeResult` schemas
- `totalCost` field exists on `Execution` schema
- `calculateWorkflowCost()` updated to use new model names
- `calculateLLMCost()` added for token-based pricing

---

## Feature Requirements

### FR1: Pre-Execution Cost Estimation
Calculate estimated workflow cost before execution based on:
- Number and type of generation nodes
- Model selection per node
- Resolution/quality settings per node
- Video duration settings

### FR2: Post-Execution Actual Cost Tracking
Track actual costs after each prediction completes:
- Store cost per job (individual Replicate prediction)
- Store cost per node (may have multiple jobs)
- Store total cost per execution
- Calculate using model-specific pricing from PRICING constants

### FR3: Cost Comparison & Analytics
Compare estimated vs actual costs:
- Show variance percentage
- Track historical cost data per workflow
- Aggregate costs by model type, resolution, time period

### FR4: Organization-Level Cost Tracking
Track costs at the organization level:
- Daily/weekly/monthly spending
- Cost allocation per workflow
- Cost allocation per user (future)

---

## Technical Design

### Schema Updates

#### 1. Update Job Schema
**File:** `apps/api/src/executions/schemas/job.schema.ts`

```typescript
@Schema({ timestamps: true, collection: 'jobs' })
export class Job extends Document {
  // ... existing fields

  @Prop({ default: 0 })
  cost: number;

  @Prop({ type: Object })
  costBreakdown?: {
    model: string;
    resolution?: string;
    duration?: number;
    unitPrice: number;
    quantity: number;
  };

  @Prop()
  predictTime?: number; // From Replicate metrics
}
```

#### 2. Update Execution Schema
**File:** `apps/api/src/executions/schemas/execution.schema.ts`

```typescript
@Schema({ _id: false })
class CostSummary {
  @Prop({ default: 0 })
  estimated: number;

  @Prop({ default: 0 })
  actual: number;

  @Prop({ default: 0 })
  variance: number; // (actual - estimated) / estimated * 100
}

@Schema({ timestamps: true, collection: 'executions' })
export class Execution extends Document {
  // ... existing fields

  @Prop({ type: Object, default: { estimated: 0, actual: 0, variance: 0 } })
  costSummary: CostSummary;

  // Replace totalCost with costSummary.actual
  // Keep totalCost for backward compatibility, computed from costSummary.actual
}
```

#### 3. New CostHistory Schema (Optional - Phase 2)
**File:** `apps/api/src/analytics/schemas/cost-history.schema.ts`

```typescript
@Schema({ timestamps: true, collection: 'cost_history' })
export class CostHistory extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workflow' })
  workflowId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Execution' })
  executionId?: Types.ObjectId;

  @Prop({ required: true })
  date: Date; // Aggregation date (daily)

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ type: Object })
  breakdown: {
    images: { count: number; cost: number };
    videos: { count: number; cost: number };
    llm: { tokens: number; cost: number };
  };
}
```

### Service Updates

#### 1. Create CostCalculatorService
**File:** `apps/api/src/cost/cost-calculator.service.ts`

```typescript
@Injectable()
export class CostCalculatorService {
  // Model pricing - Source: replicate.com/pricing (Jan 2026)
  // Image models: per output image
  // Video models: per second of output video
  // LLM models: per token
  private readonly PRICING = {
    'nano-banana': 0.039,   // $0.039/image
    'nano-banana-pro': {
      '1K': 0.15,           // $0.15/image
      '2K': 0.15,           // $0.15/image
      '4K': 0.3,            // $0.30/image
    },
    'veo-3.1-fast': { withAudio: 0.15, withoutAudio: 0.1 },
    'veo-3.1': { withAudio: 0.4, withoutAudio: 0.2 },
    'llama': 0.0000095,     // $9.50/M tokens
  };

  /**
   * Calculate estimated cost for a workflow before execution
   */
  calculateWorkflowEstimate(nodes: WorkflowNode[]): CostEstimate {
    const breakdown: CostBreakdownItem[] = [];
    let total = 0;

    for (const node of nodes) {
      const cost = this.calculateNodeCost(node);
      if (cost > 0) {
        breakdown.push({
          nodeId: node.id,
          nodeType: node.type,
          model: node.data.model,
          resolution: node.data.resolution,
          unitPrice: cost,
          quantity: 1,
          subtotal: cost,
        });
        total += cost;
      }
    }

    return { total, breakdown };
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
    switch (model) {
      case 'nano-banana':
        return this.PRICING['nano-banana'];

      case 'nano-banana-pro':
        const res = (resolution || '2K') as keyof typeof this.PRICING['nano-banana-pro'];
        return this.PRICING['nano-banana-pro'][res] ?? 0.15;

      case 'veo-3.1-fast':
      case 'veo-3.1':
        const videoKey = withAudio ? 'withAudio' : 'withoutAudio';
        const perSecond = this.PRICING[model][videoKey];
        return perSecond * (duration || 8);

      case 'llama':
        // Token-based pricing handled separately
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Calculate LLM cost based on token count
   */
  calculateLLMCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens + outputTokens) * this.PRICING['llama'];
  }
}
```

#### 2. Update ReplicateService
**File:** `apps/api/src/replicate/replicate.service.ts`

Update `handleWebhook()` to use CostCalculatorService:

```typescript
async handleWebhook(data: WebhookPayload): Promise<void> {
  const { id, status, output, error, metrics } = data;

  const job = await this.executionsService.findJobByPredictionId(id);
  if (!job) {
    this.logger.warn(`Job not found for prediction ${id}`);
    return;
  }

  // Get node data to determine model and settings
  const execution = await this.executionsService.findExecution(job.executionId.toString());
  const workflow = await this.workflowsService.findOne(execution.workflowId.toString());
  const node = workflow.nodes.find(n => n.id === job.nodeId);

  // Calculate actual cost using model-specific pricing
  const cost = this.costCalculatorService.calculatePredictionCost(
    node.data.model,
    node.data.resolution,
    node.data.duration,
    node.data.generateAudio
  );

  await this.executionsService.updateJob(id, {
    status,
    output,
    error,
    cost,
    predictTime: metrics?.predict_time,
    costBreakdown: {
      model: node.data.model,
      resolution: node.data.resolution,
      duration: node.data.duration,
      unitPrice: cost,
      quantity: 1,
    },
  });

  // Update execution cost summary
  await this.executionsService.updateExecutionCost(job.executionId.toString());
}
```

#### 3. Update ExecutionsService
**File:** `apps/api/src/executions/executions.service.ts`

Add methods:

```typescript
/**
 * Set estimated cost before execution starts
 */
async setEstimatedCost(executionId: string, estimated: number): Promise<void> {
  await this.executionModel.findByIdAndUpdate(executionId, {
    $set: { 'costSummary.estimated': estimated },
  });
}

/**
 * Update actual cost after jobs complete
 */
async updateExecutionCost(executionId: string): Promise<void> {
  const jobs = await this.findJobsByExecution(executionId);
  const actual = jobs.reduce((sum, job) => sum + (job.cost ?? 0), 0);

  const execution = await this.findExecution(executionId);
  const estimated = execution.costSummary?.estimated ?? 0;
  const variance = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;

  await this.executionModel.findByIdAndUpdate(executionId, {
    $set: {
      'costSummary.actual': actual,
      'costSummary.variance': variance,
      totalCost: actual, // Backward compatibility
    },
  });
}
```

### API Endpoints

#### 1. Get Workflow Cost Estimate
**Endpoint:** `GET /api/workflows/:id/cost-estimate`

```typescript
@Get(':id/cost-estimate')
async getCostEstimate(@Param('id') id: string): Promise<CostEstimate> {
  const workflow = await this.workflowsService.findOne(id);
  return this.costCalculatorService.calculateWorkflowEstimate(workflow.nodes);
}
```

#### 2. Get Execution Cost Details
**Endpoint:** `GET /api/executions/:id/costs`

```typescript
@Get(':id/costs')
async getExecutionCosts(@Param('id') id: string): Promise<ExecutionCostDetails> {
  const execution = await this.executionsService.findExecution(id);
  const jobs = await this.executionsService.findJobsByExecution(id);

  return {
    summary: execution.costSummary,
    jobs: jobs.map(j => ({
      nodeId: j.nodeId,
      predictionId: j.predictionId,
      cost: j.cost,
      breakdown: j.costBreakdown,
      predictTime: j.predictTime,
    })),
  };
}
```

#### 3. Get Organization Cost Summary (Phase 2)
**Endpoint:** `GET /api/analytics/costs`

```typescript
@Get('costs')
async getCostSummary(
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
  @Query('workflowId') workflowId?: string,
): Promise<OrganizationCostSummary> {
  // Implementation in Phase 2
}
```

---

## Implementation Phases

### Phase 1: Core Cost Tracking (MVP)
1. Create `CostCalculatorService` with model pricing
2. Update `Job` schema with `costBreakdown` and `predictTime`
3. Update `Execution` schema with `costSummary`
4. Update `handleWebhook()` to calculate actual costs
5. Add `GET /api/workflows/:id/cost-estimate` endpoint
6. Add `GET /api/executions/:id/costs` endpoint

### Phase 2: Analytics & History
1. Create `CostHistory` schema for daily aggregations
2. Add background job to aggregate daily costs
3. Add `GET /api/analytics/costs` endpoint
4. Add organization-level cost tracking
5. Frontend dashboard for cost visualization

### Phase 3: Cost Optimization
1. Cost alerts/notifications when thresholds exceeded
2. Recommendations for cost optimization
3. A/B comparison of models by cost/quality

---

## File Changes Summary

### New Files
- `apps/api/src/cost/cost-calculator.service.ts`
- `apps/api/src/cost/cost.module.ts`
- `apps/api/src/cost/interfaces/cost.interface.ts` (types)

### Modified Files
- `apps/api/src/executions/schemas/job.schema.ts`
- `apps/api/src/executions/schemas/execution.schema.ts`
- `apps/api/src/executions/executions.service.ts`
- `apps/api/src/replicate/replicate.service.ts`
- `apps/api/src/replicate/replicate.module.ts`
- `apps/api/src/workflows/workflows.controller.ts`
- `apps/api/src/executions/executions.controller.ts`

---

## Success Criteria

1. **Cost estimation works:**
   - `GET /api/workflows/:id/cost-estimate` returns accurate estimates
   - Estimates match expected pricing for all model types

2. **Actual cost tracking works:**
   - Webhook handler calculates correct costs per model
   - `costBreakdown` stored on each job
   - `costSummary` aggregated on execution

3. **Cost comparison accurate:**
   - Variance calculation correct
   - Estimated vs actual within 10% for standard workflows

4. **No regressions:**
   - Existing `totalCost` field still works
   - All existing tests pass

---

## References

- [node-banana repository](https://github.com/VincentShipsIt/node-banana)
- [Replicate Pricing](https://replicate.com/pricing)
- [Replicate Billing Docs](https://replicate.com/docs/topics/billing)
- [Replicate HTTP API](https://replicate.com/docs/reference/http)
- [GitHub Issue: Cost estimation](https://github.com/replicate/replicate-python/issues/243)
