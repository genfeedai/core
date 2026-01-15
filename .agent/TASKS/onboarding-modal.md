## Task: Onboarding Modal & Template Gallery

**ID:** onboarding-modal
**Label:** Onboarding Modal
**Description:** Add an onboarding modal with workflow templates, recent workflows, and tutorials to help users get started quickly.
**Type:** Feature
**Status:** Backlog
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [onboarding-modal.md](../PRDS/onboarding-modal.md)

---

## Scope
- OnboardingModal component with tabs (Templates, Recent, Tutorials)
- Template registry and gallery
- Recent workflows integration
- Tutorial cards
- "Don't show again" persistence
- Toolbar button to access templates anytime

## Acceptance Criteria
- [ ] Modal appears for first-time users and new workflows
- [ ] Templates tab shows categorized workflow templates
- [ ] Clicking a template loads pre-configured nodes/edges into canvas
- [ ] Recent tab shows user's recent workflows
- [ ] Tutorials tab shows helpful learning resources
- [ ] "Start blank" option available
- [ ] "Don't show again" preference persists (localStorage)
- [ ] "Templates" button in toolbar opens modal anytime
- [ ] At least 6 starter templates included
- [ ] Mobile responsive

## Technical Notes
- Store onboarding state in zustand with localStorage persistence
- Templates defined as static JSON (nodes + edges + metadata)
- Use existing workflowStore to load template into canvas
- Generate canvas thumbnails for recent workflows (canvas snapshot or placeholder)
- Categories: getting-started, image-generation, video-generation, social-media, automation

## Dependencies
- workflowStore (load templates)
- workflowService (fetch recent workflows)
- Node type registry (validate template nodes)

## Initial Templates
1. Hello World (Prompt → Flux → Output)
2. Text to Image Pro (Prompt → Flux → Upscale → Output)
3. Image to Video (Image → Kling/Runway → Output)
4. Instagram Post (Prompt → Flux → Caption → Publish)
5. Quick Edit (Image Input → Crop → Output)
6. Batch Generator (Multiple prompts → Flux → Output)
