# Auto-Reorder Blocks Feature

**Status:** Planning
**Priority:** Medium
**Created:** 2026-01-15
**Category:** Canvas / Layout

---

## Overview

### Problem Statement
As workflows grow in complexity, nodes can become disorganized on the canvas with edges crossing each other, making it difficult to understand the workflow flow. Users currently must manually drag nodes to organize them, which is time-consuming and error-prone. There's no automated way to arrange nodes in a clean, readable layout that respects the workflow's execution order and minimizes visual clutter.

### Goals
- Add an "Auto-Layout" button to automatically reorganize all workflow nodes
- Minimize edge crossings between nodes
- Preserve workflow execution order (topological sort)
- Create a clean, readable hierarchical layout
- Maintain node relationships and connections
- Provide visual feedback during layout animation

### Non-Goals
- Manual fine-tuning of individual node positions (users can still drag after auto-layout)
- Custom layout algorithms (use proven graph layout libraries)
- Real-time layout updates (one-time action triggered by button)
- Layout for disconnected node groups (handle separately or warn user)

## User Stories

### Primary User Story
**As a** workflow builder
**I want** to click a button to automatically arrange all my nodes in a clean layout
**So that** I can quickly organize complex workflows without manually dragging each node

### Additional Stories
- As a user, I want the auto-layout to respect the execution flow (left-to-right or top-to-bottom)
- As a user, I want edges to not cross each other unnecessarily
- As a user, I want to see a smooth animation when nodes are repositioned
- As a user, I want to undo the auto-layout if I don't like the result
- As a user, I want the layout to work with grouped nodes

## Requirements

### Functional Requirements
- FR-001: Add "Auto-Layout" button to Toolbar component
- FR-002: Implement graph layout algorithm that minimizes edge crossings
- FR-003: Use hierarchical/dagre-style layout (top-to-bottom or left-to-right flow)
- FR-004: Preserve all node connections (edges) during layout
- FR-005: Maintain node data and state during repositioning
- FR-006: Animate node movement to new positions (optional, but recommended)
- FR-007: Handle disconnected node groups (layout each group separately)
- FR-008: Respect node locking (don't move locked nodes, or layout around them)
- FR-009: Consider node dimensions when calculating spacing
- FR-010: Provide undo/redo support for layout changes

### Non-Functional Requirements
- NFR-001: Layout algorithm should complete in < 500ms for workflows with < 100 nodes
- NFR-002: Layout should be deterministic (same workflow = same layout)
- NFR-003: Preserve user's zoom level and viewport position (or fit view after layout)
- NFR-004: Accessible - keyboard shortcut support (e.g., Cmd/Ctrl+L)
- NFR-005: Visual feedback - loading state during layout calculation

## Technical Design

### Layout Algorithm Options

#### Option 1: Dagre (Recommended)
- **Library**: `dagre` or `dagre-d3`
- **Type**: Hierarchical layout (Sugiyama-style)
- **Pros**: Proven algorithm, minimizes edge crossings, handles cycles, widely used
- **Cons**: Requires dependency, may need custom configuration

#### Option 2: ELK (Eclipse Layout Kernel)
- **Library**: `elkjs` (JavaScript port)
- **Type**: Multiple layout algorithms
- **Pros**: Very powerful, multiple layout options, handles complex graphs
- **Cons**: Larger bundle size, more complex API

#### Option 3: Custom Hierarchical Layout
- **Implementation**: Build using topological sort + layer assignment
- **Pros**: No dependencies, full control
- **Cons**: More development time, edge cases to handle

**Recommendation**: Use `dagre` for MVP, consider `elkjs` if more layout options needed later.

### Component Architecture

```
Toolbar
  └── AutoLayoutButton (new)
      └── onClick → autoLayoutNodes()

workflowStore
  └── autoLayoutNodes() (new method)
      ├── Build graph from nodes/edges
      ├── Run dagre layout
      ├── Update node positions
      └── Trigger animation

WorkflowCanvas
  └── (existing, no changes needed)
```

### Key Functions

```typescript
// In workflowStore.ts
autoLayoutNodes: () => {
  // 1. Build graph structure from nodes and edges
  // 2. Run dagre layout algorithm
  // 3. Update node positions
  // 4. Mark as dirty
}

// In Toolbar.tsx
<Button onClick={autoLayoutNodes}>
  <LayoutGrid /> Auto-Layout
</Button>
```

### Layout Configuration

- **Direction**: Left-to-right (horizontal) or top-to-bottom (vertical)
- **Node spacing**: 200px horizontal, 150px vertical (configurable)
- **Ranking**: Use topological sort for node ranking
- **Edge routing**: Minimize crossings, use smoothstep edges
- **Group handling**: Layout each connected component separately

## User Flows

### Primary Flow: Auto-Layout Workflow

1. User clicks "Auto-Layout" button in Toolbar
2. System shows loading indicator
3. System calculates optimal node positions using layout algorithm
4. System animates nodes to new positions (optional)
5. System fits view to show all nodes
6. User can continue editing or undo if needed

### Edge Cases

1. **Empty workflow**: Button disabled or shows message
2. **Single node**: No layout needed, show message
3. **Disconnected groups**: Layout each group separately
4. **Locked nodes**: Layout around locked nodes or unlock warning
5. **Very large workflows (100+ nodes)**: Show progress indicator

## Success Criteria

1. [ ] Auto-Layout button visible in Toolbar
2. [ ] Clicking button reorganizes all nodes without crossing edges
3. [ ] Layout respects workflow execution order (topological sort)
4. [ ] All node connections preserved
5. [ ] Layout completes in < 500ms for typical workflows
6. [ ] Smooth animation when nodes move (optional but recommended)
7. [ ] Works with grouped nodes
8. [ ] Keyboard shortcut support (Cmd/Ctrl+L)
9. [ ] Undo/redo support
10. [ ] Test coverage > 80%

## Dependencies

### External Libraries (to evaluate)
- `dagre` - Graph layout library (recommended)
- `dagre-d3` - Dagre with D3 integration (if needed)
- `elkjs` - Alternative layout engine (if dagre insufficient)

### Internal Dependencies
- `@content-workflow/types` - WorkflowNode, WorkflowEdge types
- `@content-workflow/core` - topologicalSort function (for ranking)
- `@xyflow/react` - ReactFlow for canvas rendering
- `apps/web/src/store/workflowStore` - State management
- `apps/web/src/components/Toolbar` - UI component

## Implementation Plan

### Phase 1: MVP (Core Layout)
1. Install and configure dagre library
2. Add `autoLayoutNodes` method to workflowStore
3. Add Auto-Layout button to Toolbar
4. Basic left-to-right hierarchical layout
5. Preserve all edges and node data

### Phase 2: Polish
1. Add animation for node movement
2. Handle disconnected groups
3. Respect node locking
4. Add keyboard shortcut
5. Fit view after layout

### Phase 3: Advanced (Post-MVP)
1. Layout direction toggle (horizontal/vertical)
2. Custom spacing controls
3. Layout presets (compact, wide, tall)
4. Undo/redo integration
5. Performance optimization for large graphs

## Open Questions

1. Should locked nodes be moved or used as anchors?
2. Preferred layout direction: horizontal (left-to-right) or vertical (top-to-bottom)?
3. Should we animate node movement or instant repositioning?
4. How to handle very large workflows (100+ nodes)? Progressive layout?
5. Should layout be undoable as a single action or per-node?

## Notes

- Consider using React Flow's built-in `getNodesBounds` and `fitView` utilities
- May need to handle node dimensions (width/height) for accurate spacing
- Test with various workflow sizes: small (5 nodes), medium (20 nodes), large (50+ nodes)
- Consider accessibility: screen reader announcements, keyboard navigation
- Look at existing React Flow examples for layout implementations
