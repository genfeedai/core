## Task: Natural Language Workflow Generation

**ID:** ai-quickstart-natural-language
**Label:** Natural Language Workflow Generation
**Description:** Generate workflows from plain English descriptions using LLM
**Type:** Feature
**Status:** Done
**Priority:** High
**Created:** 2026-01-14
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/ai-quickstart-natural-language.md)

---

## Summary

Generate workflows from plain English descriptions. Uses LLM to create node graphs based on user intent.

## Key Deliverables

- [x] Natural language input interface
- [x] LLM-powered workflow generation
- [x] Node graph creation from descriptions
- [x] Template suggestions based on intent

---

## Implementation Notes

**Completed:** 2026-01-15 (Sessions 12-13)

### Files Created

**Frontend:**
- `apps/web/src/components/panels/AIGeneratorPanel.tsx` - Chat UI sidebar with message history, example prompts, load workflow button
- `apps/web/src/components/workflow/GenerateWorkflowModal.tsx` - Slide-in panel with content level options (empty/minimal/full)
- `apps/web/src/app/api/ai/generate-workflow/route.ts` - Next.js API route with comprehensive system prompt

**Backend:**
- `apps/api/src/workflows/workflow-generator.service.ts` - LLM service using Llama 3.1 70B via Replicate

### Files Modified

- `apps/web/src/store/uiStore.ts` - Added `showAIGenerator`, `toggleAIGenerator`
- `apps/web/src/components/Toolbar.tsx` - Added Sparkles icon button
- `apps/web/src/app/page.tsx` - Added AIGeneratorPanel and GenerateWorkflowModal
- `apps/api/src/workflows/workflows.module.ts` - Registered WorkflowGeneratorService
- `apps/api/src/workflows/workflows.controller.ts` - Added `/workflows/generate` POST endpoint

### Features Implemented

1. **AIGeneratorPanel** (Toolbar sidebar):
   - Chat interface with user/assistant message bubbles
   - Conversation history for multi-turn refinement
   - "Load Workflow" button when generation succeeds
   - Example prompts for quick start
   - Auto-closes after loading workflow

2. **GenerateWorkflowModal** (Backend-powered):
   - Content level selector (Empty, Placeholders, Full Content)
   - Workflow preview before applying
   - Uses Llama 3.1 70B with temperature 0.3

3. **System Prompt Design**:
   - All 15+ node types with inputs/outputs documented
   - Handle IDs for valid connections
   - Layout guidelines (x+300 per stage, y+150 for parallel)
   - JSON-only output format

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/generate-workflow` | Frontend route (Next.js) |
| POST | `/workflows/generate` | Backend route (NestJS) |
