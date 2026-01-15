# PRD: Onboarding Modal & Template Gallery

**Status:** Planning
**Priority:** High
**Complexity:** Medium
**Created:** 2026-01-15
**Category:** UX / Onboarding

---

## Executive Summary

Add an onboarding modal that appears when users create a new workflow or open the app for the first time. The modal provides quick access to workflow templates, recent workflows, and guided tutorials to help users get started quickly.

---

## Current State

- **Onboarding:** None - users start with empty canvas
- **Templates:** None - users must build workflows from scratch
- **Guidance:** No in-app tutorials or help
- **Recent workflows:** Not shown on startup

---

## User Stories

1. **As a new user**, I want to see examples and templates to understand what's possible
2. **As a returning user**, I want quick access to my recent workflows
3. **As a user**, I want to start from a template instead of building from scratch
4. **As a user**, I want guided tutorials to learn key features
5. **As a user**, I want to dismiss the modal and start with a blank canvas

---

## Technical Implementation

### Phase 1: Onboarding Modal Component

#### Task 1.1: Create Onboarding Modal
**File:** `apps/web/src/components/onboarding/OnboardingModal.tsx`

```typescript
interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  onSelectRecent: (workflowId: string) => void;
  onStartBlank: () => void;
}

type OnboardingTab = 'templates' | 'recent' | 'tutorials';
```

**Features:**
- Tab navigation (Templates, Recent, Tutorials)
- Template gallery with preview images
- Recent workflows list
- Tutorial cards with video/image previews
- "Start with blank canvas" option
- Dismissible (don't show again checkbox)

#### Task 1.2: Create Onboarding Store
**File:** `apps/web/src/store/onboardingStore.ts`

```typescript
interface OnboardingState {
  isOpen: boolean;
  hasSeenOnboarding: boolean;
  activeTab: OnboardingTab;

  open: () => void;
  close: () => void;
  setActiveTab: (tab: OnboardingTab) => void;
  markAsSeen: () => void;
}
```

---

### Phase 2: Template System

#### Task 2.1: Template Data Structure
**File:** `apps/web/src/templates/types.ts`

```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;           // Preview image URL
  nodes: WorkflowNode[];       // Pre-configured nodes
  edges: WorkflowEdge[];       // Pre-configured edges
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;       // e.g., "5 min"
  featured?: boolean;
}

type TemplateCategory =
  | 'image-generation'
  | 'video-generation'
  | 'social-media'
  | 'automation'
  | 'editing'
  | 'getting-started';
```

#### Task 2.2: Template Registry
**File:** `apps/web/src/templates/registry.ts`

```typescript
export const templates: WorkflowTemplate[] = [
  // Getting Started
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Your first workflow - generate an image from a prompt',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: '2 min',
    thumbnail: '/templates/hello-world.png',
    nodes: [
      { type: 'prompt', data: { value: 'A beautiful sunset over mountains' } },
      { type: 'flux', data: { model: 'flux-pro' } },
      { type: 'output', data: {} },
    ],
    edges: [...],
    tags: ['beginner', 'image'],
    featured: true,
  },

  // Image Generation
  {
    id: 'text-to-image-pro',
    name: 'Text to Image Pro',
    description: 'Advanced image generation with style control and upscaling',
    category: 'image-generation',
    difficulty: 'intermediate',
    estimatedTime: '5 min',
    thumbnail: '/templates/text-to-image-pro.png',
    nodes: [...],
    edges: [...],
    tags: ['image', 'upscale', 'style'],
  },

  // Video Generation
  {
    id: 'image-to-video',
    name: 'Image to Video',
    description: 'Animate any image using Runway or Kling',
    category: 'video-generation',
    difficulty: 'beginner',
    estimatedTime: '3 min',
    thumbnail: '/templates/image-to-video.png',
    nodes: [...],
    edges: [...],
    tags: ['video', 'animation'],
    featured: true,
  },

  // Social Media
  {
    id: 'instagram-carousel',
    name: 'Instagram Carousel',
    description: 'Generate multiple images for an Instagram carousel post',
    category: 'social-media',
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    thumbnail: '/templates/instagram-carousel.png',
    nodes: [...],
    edges: [...],
    tags: ['social', 'instagram', 'multi-image'],
  },

  {
    id: 'tiktok-video',
    name: 'TikTok Video',
    description: 'Create short-form video content with AI',
    category: 'social-media',
    difficulty: 'intermediate',
    estimatedTime: '15 min',
    thumbnail: '/templates/tiktok-video.png',
    nodes: [...],
    edges: [...],
    tags: ['social', 'tiktok', 'video'],
  },

  // Automation
  {
    id: 'batch-processing',
    name: 'Batch Image Processing',
    description: 'Process multiple images with consistent settings',
    category: 'automation',
    difficulty: 'advanced',
    estimatedTime: '20 min',
    thumbnail: '/templates/batch-processing.png',
    nodes: [...],
    edges: [...],
    tags: ['batch', 'automation'],
  },
];
```

#### Task 2.3: Template Gallery Component
**File:** `apps/web/src/components/onboarding/TemplateGallery.tsx`

```typescript
interface TemplateGalleryProps {
  templates: WorkflowTemplate[];
  onSelect: (templateId: string) => void;
  selectedCategory: TemplateCategory | 'all';
  onCategoryChange: (category: TemplateCategory | 'all') => void;
}
```

**Features:**
- Category filter tabs/chips
- Grid layout with template cards
- Preview thumbnail with hover effect
- Difficulty badge
- Estimated time indicator
- Featured badge for promoted templates

---

### Phase 3: Recent Workflows

#### Task 3.1: Recent Workflows Component
**File:** `apps/web/src/components/onboarding/RecentWorkflows.tsx`

```typescript
interface RecentWorkflowsProps {
  workflows: RecentWorkflow[];
  onSelect: (workflowId: string) => void;
}

interface RecentWorkflow {
  id: string;
  name: string;
  thumbnail: string;          // Auto-generated canvas preview
  lastModified: Date;
  nodeCount: number;
}
```

**Features:**
- List/grid view toggle
- Thumbnail preview (canvas snapshot)
- Last modified timestamp
- Node count indicator
- Empty state for no recent workflows

---

### Phase 4: Tutorials

#### Task 4.1: Tutorial Cards Component
**File:** `apps/web/src/components/onboarding/TutorialCards.tsx`

```typescript
interface Tutorial {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;           // Video duration or read time
  type: 'video' | 'interactive' | 'article';
  url?: string;               // External link
  steps?: TutorialStep[];     // For interactive tutorials
}

interface TutorialStep {
  title: string;
  description: string;
  target?: string;            // CSS selector for highlight
  action?: 'click' | 'drag' | 'type';
}
```

**Tutorials to include:**
- "Your First Workflow" - Interactive walkthrough
- "Understanding Nodes & Edges" - Video
- "Advanced Tips & Tricks" - Video
- "Keyboard Shortcuts" - Quick reference

---

### Phase 5: Integration

#### Task 5.1: Show Modal on New Workflow
**File:** `apps/web/src/app/studio/workflow/new/page.tsx`

```typescript
useEffect(() => {
  // Show onboarding for new workflows
  if (!onboardingStore.hasSeenOnboarding || isNewWorkflow) {
    onboardingStore.open();
  }
}, []);
```

#### Task 5.2: Menu Item to Access Templates
**File:** `apps/web/src/components/Toolbar.tsx`

```typescript
<Button onClick={() => onboardingStore.open()}>
  <LayoutTemplate /> Templates
</Button>
```

#### Task 5.3: Command Palette Integration
Add commands to open templates:
```typescript
{ id: 'open-templates', label: 'Browse Templates', category: 'workflow', icon: <LayoutTemplate /> },
{ id: 'open-tutorials', label: 'View Tutorials', category: 'workflow', icon: <GraduationCap /> },
```

---

## UI/UX Design

### Modal Layout

```
┌───────────────────────────────────────────────────────────────────┐
│                                                              ✕    │
│   Welcome to Content Workflow                                     │
│   Start with a template or create from scratch                    │
│                                                                   │
│   ┌──────────────┬──────────────┬──────────────┐                  │
│   │  Templates   │    Recent    │  Tutorials   │                  │
│   └──────────────┴──────────────┴──────────────┘                  │
│                                                                   │
│   Categories: [All] [Image] [Video] [Social] [Automation]         │
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │   ⭐        │  │             │  │             │               │
│   │  [Image]    │  │  [Image]    │  │  [Image]    │               │
│   │             │  │             │  │             │               │
│   │ Hello World │  │ Text to     │  │ Image to    │               │
│   │ ○ Beginner  │  │ Image Pro   │  │ Video       │               │
│   │ 2 min       │  │ ○○ Medium   │  │ ○ Beginner  │               │
│   └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │  Or start with a blank canvas                           →   │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│   □ Don't show this again                                         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Template Card

```
┌─────────────────────┐
│   ⭐ Featured       │  ← Badge
│  ╔═══════════════╗  │
│  ║   [Preview]   ║  │  ← Thumbnail
│  ║     Image     ║  │
│  ╚═══════════════╝  │
│                     │
│  Hello World        │  ← Title
│  Your first         │  ← Description
│  workflow...        │
│                     │
│  ○ Beginner  2 min  │  ← Difficulty + Time
└─────────────────────┘
```

### Styling

- **Modal:** Large, centered, subtle backdrop
- **Tabs:** Underline active tab
- **Cards:** Shadow on hover, scale transform
- **Categories:** Chip/pill buttons
- **Featured badge:** Star icon, gold color
- **Difficulty:** Dots (○ ○○ ○○○) or text

---

## File Creation Checklist

### Components
- [ ] `apps/web/src/components/onboarding/OnboardingModal.tsx`
- [ ] `apps/web/src/components/onboarding/TemplateGallery.tsx`
- [ ] `apps/web/src/components/onboarding/TemplateCard.tsx`
- [ ] `apps/web/src/components/onboarding/RecentWorkflows.tsx`
- [ ] `apps/web/src/components/onboarding/TutorialCards.tsx`
- [ ] `apps/web/src/components/onboarding/index.ts`

### Templates
- [ ] `apps/web/src/templates/types.ts`
- [ ] `apps/web/src/templates/registry.ts`
- [ ] `apps/web/src/templates/getting-started/hello-world.ts`
- [ ] `apps/web/src/templates/image-generation/text-to-image-pro.ts`
- [ ] `apps/web/src/templates/video-generation/image-to-video.ts`
- [ ] `apps/web/src/templates/index.ts`

### State
- [ ] `apps/web/src/store/onboardingStore.ts`

### Integration
- [ ] Update Toolbar with "Templates" button
- [ ] Update new workflow page to show modal
- [ ] Add commands to command palette

### Assets
- [ ] Template preview images (public/templates/)
- [ ] Tutorial thumbnails

---

## Success Criteria

1. Modal appears for first-time users and new workflows
2. Templates tab shows categorized workflow templates
3. Clicking a template loads it into the canvas
4. Recent tab shows user's recent workflows
5. Tutorials tab shows helpful learning resources
6. "Start blank" option closes modal and shows empty canvas
7. "Don't show again" checkbox persists preference
8. Templates button in toolbar opens modal anytime
9. Command palette includes template/tutorial commands
10. Mobile responsive (smaller modal on mobile)

---

## Template Ideas (Initial Set)

### Getting Started
1. **Hello World** - Prompt → Flux → Output
2. **Quick Edit** - Image Input → Crop → Output

### Image Generation
3. **Text to Image Pro** - Prompt → Flux → Upscale → Output
4. **Style Transfer** - Image Input → Style Prompt → Flux → Output
5. **Batch Generator** - Multiple prompts → Flux (loop) → Output

### Video Generation
6. **Image to Video** - Image Input → Runway/Kling → Output
7. **Text to Video** - Prompt → Flux → Kling → Output
8. **Video with Audio** - Image → Video → Audio → Output

### Social Media
9. **Instagram Post** - Prompt → Flux → Caption → Publish
10. **TikTok Video** - Image → Video → Music → Publish
11. **YouTube Thumbnail** - Prompt → Flux → Text Overlay → Output

### Automation
12. **Batch Processing** - Input Folder → Processing → Output Folder
13. **Scheduled Posts** - Timer → Generate → Publish

---

## Dependencies

### External
- None required (can use native components)

### Internal
- workflowStore - Load template into canvas
- workflowService - Fetch recent workflows
- Node type registry - Validate template nodes

---

## Estimated Complexity

- OnboardingModal: ~200 lines
- TemplateGallery: ~150 lines
- Template definitions: ~300 lines (grows over time)
- Store: ~50 lines
- Total: ~700 lines of code

---

## Open Questions

1. Should templates be stored locally or fetched from API?
2. How to generate canvas thumbnails for recent workflows?
3. Should we track template usage analytics?
4. How many templates to ship initially? (Suggest: 6-8)
5. Should users be able to save their own templates?
