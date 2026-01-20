# Architecture: OSS + SaaS Integration (Vercel Model)

## Goals
1. **Community-first**: OSS is 100% standalone, self-hostable, no genfeed.ai dependency
2. **Genfeed.ai uses OSS**: SaaS imports OSS as packages, adds platform features
3. **Marketplace**: Community sells prompts, workflows, templates on genfeed.ai

## The Vercel Model Applied

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                     │
├─────────────────────────┬───────────────────────────────────────┤
│   Self-Hosters          │   Genfeed.ai Users                    │
│   (use OSS directly)    │   (use hosted SaaS)                   │
└───────────┬─────────────┴─────────────────┬─────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────────┐   ┌─────────────────────────────────────┐
│  genfeed                  │   │  genfeed.ai (SaaS)                  │
│  (OSS - genfeedai org)    │   │  (Private - genfeedai org)          │
│                           │   │                                     │
│  • Visual workflow        │   │  • Auth (users, orgs, teams)        │
│    editor                 │   │  • Billing (Stripe)                 │
│  • Node system            │   │  • Marketplace (prompts, workflows) │
│  • Execution engine       │   │  • Analytics & usage tracking       │
│  • Local storage          │   │  • Cloud storage (S3, CDN)          │
│  • CLI tools              │   │  • Collaboration features           │
│                           │   │  • AI features (premium)            │
│  npm: @genfeedai/core     │◄──┤  • Hosting & deployment             │
│  npm: @genfeedai/types    │   │                                     │
│  npm: @genfeedai/cli      │   │  imports: @genfeedai/core, types    │
└───────────────────────────┘   └─────────────────────────────────────┘
```

## Repository Structure

### Repo 1: `genfeedai/core` (Public OSS)
```
core/
├── apps/
│   ├── web/              # Standalone editor (Next.js)
│   ├── api/              # Local API server (NestJS)
│   └── cli/              # CLI tool
├── packages/
│   ├── core/             # → npm: @genfeedai/core
│   ├── types/            # → npm: @genfeedai/types
│   ├── nodes/            # → npm: @genfeedai/nodes
│   └── ui/               # → npm: @genfeedai/ui
├── docker-compose.yml    # Self-host in 1 command
└── README.md             # "Deploy to Vercel" button
```

### Repo 2: `genfeedai/platform` (Private SaaS)
```
genfeedai/
├── apps/
│   ├── web/              # genfeed.ai frontend (imports @genfeedai/ui)
│   ├── api/              # genfeed.ai API (imports @genfeedai/core)
│   └── workers/          # Background jobs
├── packages/
│   ├── auth/             # Auth system (SaaS-only)
│   ├── billing/          # Stripe integration (SaaS-only)
│   ├── marketplace/      # Marketplace features (SaaS-only)
│   └── analytics/        # Usage tracking (SaaS-only)
└── package.json          # depends on @genfeedai/*
```

## Integration Points

### 1. Package Dependencies
```json
// genfeedai/package.json
{
  "dependencies": {
    "@genfeedai/core": "^1.0.0",
    "@genfeedai/types": "^1.0.0",
    "@genfeedai/ui": "^1.0.0"
  }
}
```

### 2. Extension Points in OSS
Design the OSS with extension hooks that SaaS can use:

```typescript
// @genfeedai/core
export interface WorkflowEngine {
  // Core functionality
  execute(workflow: Workflow): Promise<Result>;

  // Extension hooks (SaaS can inject)
  onBeforeExecute?: (ctx: ExecutionContext) => Promise<void>;
  onAfterExecute?: (ctx: ExecutionContext, result: Result) => Promise<void>;
  storageAdapter?: StorageAdapter;  // Local vs S3
  authAdapter?: AuthAdapter;        // None vs Genfeed auth
}
```

### 3. Storage Abstraction
```typescript
// OSS default: local storage
class LocalStorageAdapter implements StorageAdapter {
  save(key: string, data: Buffer): Promise<string>;
}

// SaaS override: cloud storage
class GenfeedStorageAdapter implements StorageAdapter {
  save(key: string, data: Buffer): Promise<string>; // → S3
}
```

## Feature Distribution

| Feature | OSS (Free) | Genfeed (SaaS) |
|---------|------------|----------------|
| Visual editor | ✅ | ✅ |
| Node library | ✅ (core nodes) | ✅ (+ premium nodes) |
| Workflow execution | ✅ (local) | ✅ (cloud + queued) |
| Storage | ✅ (local/self-hosted) | ✅ (managed S3) |
| Auth | ❌ (none/DIY) | ✅ (users, teams, orgs) |
| Marketplace | ❌ | ✅ |
| Collaboration | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Support | Community | Paid tiers |

## Publishing Workflow

```bash
# In genfeed repo
bun run build
bun run publish  # Publishes to npm

# In genfeedai platform repo
bun update @genfeedai/core  # Get latest OSS
```

## Key Principles

1. **OSS is complete** - Users can run everything locally without genfeed.ai
2. **No feature crippling** - OSS has full functionality, SaaS adds convenience
3. **Clean boundaries** - SaaS never forks, only imports and extends
4. **Upstream contributions** - Bug fixes go to OSS, not private patches

## Examples in the Wild

| Company | OSS | SaaS Additions |
|---------|-----|----------------|
| Vercel | Next.js | Hosting, analytics, edge |
| Supabase | PostgreSQL + APIs | Hosting, auth, dashboard |
| Cal.com | cal.com | Teams, enterprise, support |
| Posthog | posthog | Cloud hosting, support |
| n8n | n8n | Cloud, SSO, support |

---
**Created:** 2026-01-14
**Updated:** 2026-01-15
