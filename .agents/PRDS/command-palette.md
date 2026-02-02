# PRD: Command Palette

**Status:** Done
**Priority:** High
**Complexity:** Medium
**Created:** 2026-01-15
**Category:** UX / Navigation

---

## Executive Summary

Add a command palette (Cmd/Ctrl+K) for quick access to all application actions, node creation, navigation, and settings. This is a power-user feature that dramatically improves workflow efficiency by providing keyboard-first access to any action.

---

## Current State

- **Quick actions:** None - users must navigate UI manually
- **Node creation:** Only via sidebar or context menu
- **Navigation:** No keyboard shortcuts for common actions
- **Search:** No global search across workflows, nodes, or actions

---

## User Stories

1. **As a power user**, I want to press Cmd+K to instantly access any action
2. **As a user**, I want to quickly add nodes without moving my mouse
3. **As a user**, I want to search across all available actions and nodes
4. **As a user**, I want to see keyboard shortcuts for each action
5. **As a user**, I want recent actions to appear first in the palette

---

## Technical Implementation

### Phase 1: Core Command Palette

#### Task 1.1: Create Command Palette Component
**File:** `apps/web/src/components/command-palette/CommandPalette.tsx`

```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category: CommandCategory;
  keywords?: string[];       // For search matching
  action: () => void;
  disabled?: boolean;
}

type CommandCategory =
  | 'nodes'           // Add node commands
  | 'actions'         // General actions (save, undo, redo)
  | 'navigation'      // Navigation (fit view, zoom)
  | 'workflow'        // Workflow operations (run, export)
  | 'settings';       // Settings and preferences
```

**Features:**
- Fuzzy search across command labels and keywords
- Category grouping with headers
- Keyboard navigation (arrow keys, Enter, Escape)
- Recent commands section
- Shortcut hints
- Loading states for async commands

#### Task 1.2: Create Command Palette Store
**File:** `apps/web/src/store/commandPaletteStore.ts`

```typescript
interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  recentCommands: string[];    // Command IDs

  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
  addToRecent: (commandId: string) => void;
}
```

---

### Phase 2: Command Registry

#### Task 2.1: Node Commands
**File:** `apps/web/src/components/command-palette/commands/nodeCommands.ts`

```typescript
export const nodeCommands: Command[] = [
  // Input Nodes
  { id: 'add-prompt', label: 'Add Prompt Node', category: 'nodes', icon: <Text />, keywords: ['text', 'input'] },
  { id: 'add-image-input', label: 'Add Image Input', category: 'nodes', icon: <ImageIcon />, keywords: ['upload', 'file'] },
  { id: 'add-video-input', label: 'Add Video Input', category: 'nodes', icon: <Video />, keywords: ['upload', 'file'] },

  // Generation Nodes
  { id: 'add-flux', label: 'Add Flux Image Generator', category: 'nodes', icon: <Sparkles />, keywords: ['image', 'ai', 'generate'] },
  { id: 'add-runway', label: 'Add Runway Video Generator', category: 'nodes', icon: <Film />, keywords: ['video', 'ai', 'generate'] },
  { id: 'add-kling', label: 'Add Kling Video Generator', category: 'nodes', icon: <Film />, keywords: ['video', 'ai', 'generate'] },

  // Processing Nodes
  { id: 'add-upscale', label: 'Add Upscale Node', category: 'nodes', icon: <Maximize />, keywords: ['enhance', 'quality'] },
  { id: 'add-crop', label: 'Add Crop Node', category: 'nodes', icon: <Crop />, keywords: ['resize', 'cut'] },

  // Output Nodes
  { id: 'add-output', label: 'Add Output Node', category: 'nodes', icon: <Monitor />, keywords: ['export', 'save'] },
  { id: 'add-publish', label: 'Add Publish Node', category: 'nodes', icon: <Share />, keywords: ['social', 'post'] },
];
```

#### Task 2.2: Action Commands
**File:** `apps/web/src/components/command-palette/commands/actionCommands.ts`

```typescript
export const actionCommands: Command[] = [
  // File Operations
  { id: 'save', label: 'Save Workflow', category: 'actions', shortcut: 'Cmd+S', icon: <Save /> },
  { id: 'save-as', label: 'Save As...', category: 'actions', shortcut: 'Cmd+Shift+S', icon: <SaveAll /> },
  { id: 'export', label: 'Export Workflow', category: 'actions', icon: <Download /> },
  { id: 'import', label: 'Import Workflow', category: 'actions', icon: <Upload /> },

  // Edit Operations
  { id: 'undo', label: 'Undo', category: 'actions', shortcut: 'Cmd+Z', icon: <Undo /> },
  { id: 'redo', label: 'Redo', category: 'actions', shortcut: 'Cmd+Shift+Z', icon: <Redo /> },
  { id: 'select-all', label: 'Select All Nodes', category: 'actions', shortcut: 'Cmd+A', icon: <CheckSquare /> },
  { id: 'delete-selected', label: 'Delete Selected', category: 'actions', shortcut: 'Del', icon: <Trash /> },
  { id: 'duplicate-selected', label: 'Duplicate Selected', category: 'actions', shortcut: 'Cmd+D', icon: <Copy /> },

  // Layout Operations
  { id: 'auto-layout', label: 'Auto-Layout Nodes', category: 'actions', shortcut: 'Cmd+L', icon: <LayoutGrid /> },
  { id: 'align-horizontal', label: 'Align Horizontally', category: 'actions', icon: <AlignHorizontalCenter /> },
  { id: 'align-vertical', label: 'Align Vertically', category: 'actions', icon: <AlignVerticalCenter /> },
];
```

#### Task 2.3: Navigation Commands
**File:** `apps/web/src/components/command-palette/commands/navigationCommands.ts`

```typescript
export const navigationCommands: Command[] = [
  { id: 'fit-view', label: 'Fit View', category: 'navigation', shortcut: 'F', icon: <Maximize2 /> },
  { id: 'zoom-in', label: 'Zoom In', category: 'navigation', shortcut: 'Cmd++', icon: <ZoomIn /> },
  { id: 'zoom-out', label: 'Zoom Out', category: 'navigation', shortcut: 'Cmd+-', icon: <ZoomOut /> },
  { id: 'zoom-100', label: 'Zoom to 100%', category: 'navigation', shortcut: 'Cmd+0', icon: <Square /> },
  { id: 'center-selection', label: 'Center on Selection', category: 'navigation', icon: <Target /> },
];
```

#### Task 2.4: Workflow Commands
**File:** `apps/web/src/components/command-palette/commands/workflowCommands.ts`

```typescript
export const workflowCommands: Command[] = [
  { id: 'run-workflow', label: 'Run Workflow', category: 'workflow', shortcut: 'Cmd+Enter', icon: <Play /> },
  { id: 'stop-workflow', label: 'Stop Workflow', category: 'workflow', shortcut: 'Cmd+.', icon: <Square /> },
  { id: 'clear-results', label: 'Clear All Results', category: 'workflow', icon: <Eraser /> },
  { id: 'validate', label: 'Validate Workflow', category: 'workflow', icon: <CheckCircle /> },
];
```

---

### Phase 3: Search and Filtering

#### Task 3.1: Fuzzy Search Implementation
**File:** `apps/web/src/components/command-palette/utils/fuzzySearch.ts`

```typescript
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: ['label', 'keywords', 'description'],
  threshold: 0.3,
  includeScore: true,
};

export function searchCommands(commands: Command[], query: string): Command[] {
  if (!query) {
    return commands;
  }

  const fuse = new Fuse(commands, fuseOptions);
  return fuse.search(query).map(result => result.item);
}
```

#### Task 3.2: Category Filtering
```typescript
// Filter syntax: "nodes:" shows only node commands
// ">" prefix for actions, "/" for navigation
const categoryPrefixes = {
  'nodes:': 'nodes',
  '>': 'actions',
  '/': 'navigation',
  '@': 'workflow',
};
```

---

### Phase 4: Integration

#### Task 4.1: Global Keyboard Shortcut
**File:** `apps/web/src/hooks/useGlobalShortcuts.ts`

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      commandPaletteStore.open();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### Task 4.2: Render in App Layout
**File:** `apps/web/src/app/studio/workflow/[id]/page.tsx`

```typescript
return (
  <>
    <WorkflowCanvas />
    <CommandPalette
      isOpen={commandPaletteStore.isOpen}
      onClose={commandPaletteStore.close}
    />
  </>
);
```

---

## UI/UX Design

### Visual Design

```
┌─────────────────────────────────────────────────────┐
│  🔍 Search commands...                       Esc    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  RECENT                                             │
│  ▸ Add Flux Image Generator               nodes     │
│  ▸ Run Workflow                         Cmd+Enter   │
│                                                     │
│  NODES                                              │
│  ▸ Add Prompt Node                        nodes     │
│  ▸ Add Image Input                        nodes     │
│  ▸ Add Video Input                        nodes     │
│                                                     │
│  ACTIONS                                            │
│  ▸ Save Workflow                         Cmd+S      │
│  ▸ Undo                                  Cmd+Z      │
│  ▸ Auto-Layout Nodes                     Cmd+L      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Styling

- **Modal:** Centered, blurred backdrop, rounded corners
- **Input:** Large, prominent search field with icon
- **Categories:** Subtle headers with uppercase text
- **Items:** Hover highlight, icon + label + shortcut
- **Selected:** Background highlight for keyboard selection
- **Animation:** Fade in/out, scale transform

---

## File Creation Checklist

### Components
- [ ] `apps/web/src/components/command-palette/CommandPalette.tsx`
- [ ] `apps/web/src/components/command-palette/CommandItem.tsx`
- [ ] `apps/web/src/components/command-palette/CommandGroup.tsx`
- [ ] `apps/web/src/components/command-palette/CommandSearch.tsx`

### Commands
- [ ] `apps/web/src/components/command-palette/commands/nodeCommands.ts`
- [ ] `apps/web/src/components/command-palette/commands/actionCommands.ts`
- [ ] `apps/web/src/components/command-palette/commands/navigationCommands.ts`
- [ ] `apps/web/src/components/command-palette/commands/workflowCommands.ts`
- [ ] `apps/web/src/components/command-palette/commands/index.ts`

### State & Utils
- [ ] `apps/web/src/store/commandPaletteStore.ts`
- [ ] `apps/web/src/components/command-palette/utils/fuzzySearch.ts`
- [ ] `apps/web/src/hooks/useGlobalShortcuts.ts`

---

## Success Criteria

1. Cmd/Ctrl+K opens command palette from anywhere
2. Typing filters commands with fuzzy search
3. Arrow keys navigate, Enter executes, Escape closes
4. Recent commands shown at top
5. All node types available as commands
6. Keyboard shortcuts displayed for each command
7. Categories clearly organized
8. Works on both Mac and Windows (Cmd/Ctrl)
9. Responsive design (works on smaller screens)

---

## Dependencies

### External Libraries
- `fuse.js` - Fuzzy search library
- `cmdk` - Optional: Headless command palette (alternative to custom implementation)

### Internal Dependencies
- `apps/web/src/store/workflowStore` - For node operations
- `@xyflow/react` - For canvas operations (fitView, zoom)
- Existing node type registry

---

## Estimated Complexity

- CommandPalette component: ~200 lines
- Command registrations: ~150 lines
- Store and hooks: ~100 lines
- Search utils: ~50 lines
- Total: ~500 lines of code

---

## Open Questions

1. Should we use `cmdk` library or build custom? (cmdk is lighter but less flexible)
2. Should commands be extensible via plugins/extensions?
3. How many recent commands to show? (Suggest: 5)
4. Should we persist recent commands to localStorage?
