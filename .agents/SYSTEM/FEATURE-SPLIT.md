# Core OSS vs Cloud SaaS Feature Split

**Last Updated:** 2026-02-02

This document defines which features belong in Core OSS vs Cloud SaaS. AI agents should reference this before implementing features.

---

## Core OSS Features (Fully Self-Hostable)

### Editor & UX
- Auto-save
- Command palette (Cmd+K)
- Onboarding modal + template gallery
- Auto-layout
- Right-click context menus
- Image annotation editor
- Group locking
- Input group system
- n8n-style minimap
- Node dependency highlighting
- Drop-to-connect
- Comment nodes

### Workflow Management
- **Export/Import workflows** (JSON files for sharing)
- Workflow composition (nested workflows via workflowRef)
- Template library
- Prompt library

### AI & Generation Nodes
- 30+ node types across 6 categories
- Multi-provider support (Replicate, OpenAI, 11Labs)
- Image generation (nano-banana models)
- Video generation (veo-3.1 models)
- LLM text generation
- Text-to-speech
- Lip sync & voice change
- Transcription

### Processing Nodes
- Reframe (image/video)
- Upscale (image/video)
- Video trim/stitch
- Frame extraction
- Image grid split
- Subtitle burning
- Animation

### Execution & Infrastructure
- Cost tracking & analytics
- BullMQ job queue
- Real-time SSE streaming
- Docker support
- **Health checks + metrics** (production readiness)

### Extensibility
- **Ollama integration** (local LLMs)
- **Custom node SDK** (community nodes)

### Planned Additions
- **Kling Motion Control** (advanced video animation)

---

## Cloud SaaS Only Features (NOT in Core OSS)

These features require multi-tenant infrastructure and are monetization drivers:

| Feature | Reason |
|---------|--------|
| Team collaboration | Multi-tenant architecture, user management |
| Cloud storage/CDN | Infrastructure cost, S3/CloudFront |
| Usage billing & quotas | SaaS monetization, Stripe integration |
| Managed hosting | Operational overhead, scaling |
| Priority support | Revenue driver |
| Workflow marketplace | Platform network effects, moderation |
| Organization management | Multi-tenant data isolation |
| Role-based access control | Enterprise feature |
| SSO/SAML | Enterprise authentication |
| Audit logs | Compliance feature |
| White-labeling | Enterprise customization |
| Telegram Bot | Managed bot for workflow execution via chat |
| Webhook triggers | Public webhook endpoints for external integrations |
| Scheduled execution | Cron-based workflow scheduling |

---

## Decision Criteria

**Goes in Core OSS if:**
- Works completely offline/self-hosted
- No external service dependencies beyond user-provided API keys
- Single-user/single-tenant usage
- Enables community contribution
- Core workflow functionality

**Goes in Cloud SaaS if:**
- Requires multi-tenant data isolation
- Has infrastructure costs (storage, CDN, compute)
- Needs centralized management/moderation
- Is a monetization feature
- Requires ongoing operational support

---

## AI Agent Guidelines

1. **Never implement SaaS features in Core** - Check this file first
2. **No organization/team references** - Core is single-user
3. **No billing/quota code** - Core is free/unlimited
4. **No cloud storage integration** - Use local filesystem
5. **Self-contained is key** - All features must work offline
6. **No bot/trigger integrations** - Core is manually triggered from the UI only (no webhooks, no bots, no scheduled execution)
7. **No CLI or SDK packages** - Removed from core scope (CLI and SDK have been deleted)
