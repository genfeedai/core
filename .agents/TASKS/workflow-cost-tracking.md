## Task: Workflow Cost Tracking & Analytics

**ID:** workflow-cost-tracking
**Label:** Workflow Cost Tracking & Analytics
**Description:** Track estimated vs actual costs per execution with model-specific pricing
**Type:** Feature
**Status:** Done
**Priority:** High
**Order:** 3
**Created:** 2026-01-14
**Updated:** 2026-01-14
**PRD:** [Link](../PRDS/workflow-cost-tracking.md)

---

## Summary

Implement cost tracking and analytics for workflow executions. Track estimated vs actual costs, provide model-specific pricing (Imagen 4, Veo 3, Llama), and show cost breakdown per node/job.

## Key Deliverables

- Cost estimation before execution
- Real-time cost tracking during execution
- Cost breakdown per node/job
- Historical cost analytics
- Model-specific pricing configuration

## Reference

Inspired by [node-banana](https://github.com/VincentShipsIt/node-banana)

---

## Completion Notes (Phase 1 - MVP)

**Completed:** 2026-01-14

### Files Created
- `apps/api/src/cost/cost-calculator.service.ts` - Model pricing and cost calculation
- `apps/api/src/cost/cost.module.ts` - NestJS module
- `apps/api/src/cost/interfaces/cost.interface.ts` - TypeScript interfaces

### Files Modified
- `apps/api/src/executions/schemas/job.schema.ts` - Added `cost`, `costBreakdown`, `predictTime`
- `apps/api/src/executions/schemas/execution.schema.ts` - Added `CostSummarySchema` with estimated/actual/variance
- `apps/api/src/executions/executions.service.ts` - Added `setEstimatedCost()`, `updateExecutionCost()`, `getExecutionCostDetails()`
- `apps/api/src/replicate/replicate.service.ts` - Webhook handler calculates costs via CostCalculatorService
- `apps/api/src/workflows/workflows.controller.ts` - Added `GET /workflows/:id/cost-estimate`
- `apps/api/src/executions/executions.controller.ts` - Added `GET /executions/:id/costs`

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /workflows/:id/cost-estimate` | Pre-execution cost estimate with breakdown |
| `GET /executions/:id/costs` | Actual costs with job-level breakdown |

### Model Pricing (Jan 2026)
| Model | Type | Price |
|-------|------|-------|
| nano-banana | Image | $0.039/image |
| nano-banana-pro | Image | $0.15/image (1K/2K), $0.30/image (4K) |
| veo-3.1-fast | Video | $0.10/sec (no audio), $0.15/sec (with audio) |
| veo-3.1 | Video | $0.20/sec (no audio), $0.40/sec (with audio) |
| llama | LLM | $9.50/M tokens |

### Phase 2 (Future)
- CostHistory schema for daily aggregations
- Organization-level cost tracking
- `GET /analytics/costs` endpoint
- Frontend cost visualization dashboard
