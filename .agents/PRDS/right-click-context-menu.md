# PRD: Right-Click Context Menu

**Status:** Doing
**Priority:** High
**Complexity:** Low

---

## Executive Summary

Add a context menu (right-click menu) to the workflow canvas for quick access to common operations on nodes, edges, and the canvas itself. This improves UX by providing discoverable actions without cluttering the UI.

---

## Current State

- **Context menu:** None
- **Node operations:** Only via configuration panel or keyboard
- **Delete:** No UI for deletion (only via store method)
- **Duplicate:** Not implemented
- **React Flow:** Supports context menu via `onNodeContextMenu` and `onPaneContextMenu`

---

## User Stories

1. **As a user**, I want to right-click a node to see available actions (delete, duplicate, lock)
2. **As a user**, I want to right-click the canvas to add new nodes quickly
3. **As a user**, I want to right-click edges to delete or reroute connections
4. **As a user**, I want context menus to show keyboard shortcuts for learning
5. **As a user**, I want to right-click multiple selected nodes for batch operations

---

## Technical Implementation

### Phase 1: Context Menu Component

#### Task 1.1: Create ContextMenu Component
**File:** `apps/web/src/components/context-menu/ContextMenu.tsx`

```typescript
interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;        // Red color for destructive actions
  separator?: boolean;     // Render as separator line
  onClick: () => void;
}
```

**Features:**
- Position at mouse coordinates
- Close on click outside or Escape
- Keyboard navigation (arrow keys, Enter)
- Icons and shortcut hints
- Disabled state for unavailable actions
- Danger styling for destructive actions

#### Task 1.2: Create Context Menu Store
**File:** `apps/web/src/store/contextMenuStore.ts`

```typescript
interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  menuType: 'node' | 'edge' | 'pane' | 'selection' | null;
  targetId: string | null;          // Node or edge ID
  targetIds: string[] | null;       // For multi-selection

  openNodeMenu: (nodeId: string, x: number, y: number) => void;
  openEdgeMenu: (edgeId: string, x: number, y: number) => void;
  openPaneMenu: (x: number, y: number) => void;
  openSelectionMenu: (nodeIds: string[], x: number, y: number) => void;
  close: () => void;
}
```

---

### Phase 2: Menu Configurations

#### Task 2.1: Node Context Menu Items
**File:** `apps/web/src/components/context-menu/menus/nodeMenu.ts`

```typescript
const nodeMenuItems: ContextMenuItem[] = [
  { id: 'edit', label: 'Edit Node', icon: <Edit />, shortcut: 'Enter' },
  { id: 'duplicate', label: 'Duplicate', icon: <Copy />, shortcut: 'Ctrl+D' },
  { id: 'separator-1', separator: true },
  { id: 'lock', label: 'Lock Node', icon: <Lock />, shortcut: 'L' },
  { id: 'separator-2', separator: true },
  { id: 'cut', label: 'Cut', icon: <Scissors />, shortcut: 'Ctrl+X' },
  { id: 'copy', label: 'Copy', icon: <Copy />, shortcut: 'Ctrl+C' },
  { id: 'separator-3', separator: true },
  { id: 'delete', label: 'Delete', icon: <Trash />, shortcut: 'Del', danger: true },
];
```

#### Task 2.2: Multi-Selection Context Menu
**File:** `apps/web/src/components/context-menu/menus/selectionMenu.ts`

```typescript
const selectionMenuItems: ContextMenuItem[] = [
  { id: 'group', label: 'Create Group', icon: <Group />, shortcut: 'Ctrl+G' },
  { id: 'duplicate-all', label: 'Duplicate All', icon: <Copy />, shortcut: 'Ctrl+D' },
  { id: 'lock-all', label: 'Lock All', icon: <Lock />, shortcut: 'L' },
  { id: 'unlock-all', label: 'Unlock All', icon: <Unlock /> },
  { id: 'separator-1', separator: true },
  { id: 'align-horizontal', label: 'Align Horizontally', icon: <AlignH /> },
  { id: 'align-vertical', label: 'Align Vertically', icon: <AlignV /> },
  { id: 'separator-2', separator: true },
  { id: 'delete-all', label: 'Delete All', icon: <Trash />, shortcut: 'Del', danger: true },
];
```

#### Task 2.3: Canvas (Pane) Context Menu
**File:** `apps/web/src/components/context-menu/menus/paneMenu.ts`

```typescript
const paneMenuItems: ContextMenuItem[] = [
  { id: 'add-prompt', label: 'Add Prompt Node', icon: <Text /> },
  { id: 'add-image-gen', label: 'Add Image Generator', icon: <Image /> },
  { id: 'add-video-gen', label: 'Add Video Generator', icon: <Video /> },
  { id: 'add-llm', label: 'Add LLM Node', icon: <Bot /> },
  { id: 'add-output', label: 'Add Output Node', icon: <Monitor /> },
  { id: 'separator-1', separator: true },
  { id: 'paste', label: 'Paste', icon: <Clipboard />, shortcut: 'Ctrl+V' },
  { id: 'separator-2', separator: true },
  { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A' },
  { id: 'fit-view', label: 'Fit View', shortcut: 'F' },
];
```

#### Task 2.4: Edge Context Menu
**File:** `apps/web/src/components/context-menu/menus/edgeMenu.ts`

```typescript
const edgeMenuItems: ContextMenuItem[] = [
  { id: 'delete', label: 'Delete Connection', icon: <Trash />, danger: true },
];
```

---

### Phase 3: Integration with React Flow

#### Task 3.1: Add Event Handlers to Canvas
**File:** `apps/web/src/components/canvas/WorkflowCanvas.tsx`

```typescript
<ReactFlow
  // ... existing props
  onNodeContextMenu={(event, node) => {
    event.preventDefault();
    contextMenuStore.openNodeMenu(node.id, event.clientX, event.clientY);
  }}
  onEdgeContextMenu={(event, edge) => {
    event.preventDefault();
    contextMenuStore.openEdgeMenu(edge.id, event.clientX, event.clientY);
  }}
  onPaneContextMenu={(event) => {
    event.preventDefault();
    contextMenuStore.openPaneMenu(event.clientX, event.clientY);
  }}
  onSelectionContextMenu={(event, nodes) => {
    event.preventDefault();
    contextMenuStore.openSelectionMenu(
      nodes.map(n => n.id),
      event.clientX,
      event.clientY
    );
  }}
>
```

#### Task 3.2: Render Context Menu
**File:** `apps/web/src/components/canvas/WorkflowCanvas.tsx`

```typescript
return (
  <>
    <ReactFlow>...</ReactFlow>
    {contextMenuStore.isOpen && (
      <ContextMenu
        x={contextMenuStore.position.x}
        y={contextMenuStore.position.y}
        items={getMenuItems()}
        onClose={contextMenuStore.close}
      />
    )}
  </>
);
```

---

### Phase 4: Action Handlers

#### Task 4.1: Implement Node Actions
**File:** `apps/web/src/hooks/useNodeActions.ts`

```typescript
export function useNodeActions() {
  const workflowStore = useWorkflowStore();

  return {
    deleteNode: (nodeId: string) => {
      workflowStore.removeNode(nodeId);
    },
    duplicateNode: (nodeId: string) => {
      const node = workflowStore.nodes.find(n => n.id === nodeId);
      if (node) {
        const newNode = {
          ...node,
          id: generateId(),
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50
          }
        };
        workflowStore.addNode(newNode);
      }
    },
    lockNode: (nodeId: string) => {
      workflowStore.toggleNodeLock(nodeId);
    },
    copyNode: (nodeId: string) => {
      // Copy to clipboard
    },
    cutNode: (nodeId: string) => {
      // Copy then delete
    },
  };
}
```

#### Task 4.2: Implement Pane Actions
**File:** `apps/web/src/hooks/usePaneActions.ts`

```typescript
export function usePaneActions() {
  const workflowStore = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  return {
    addNodeAtPosition: (type: string, screenX: number, screenY: number) => {
      const position = screenToFlowPosition({ x: screenX, y: screenY });
      workflowStore.addNode({
        id: generateId(),
        type,
        position,
        data: getDefaultNodeData(type)
      });
    },
    pasteNodes: () => {
      // Paste from clipboard
    },
    selectAll: () => {
      // Select all nodes
    },
    fitView: () => {
      // Fit view to all nodes
    },
  };
}
```

---

## UI/UX Design

### Menu Appearance

```
┌────────────────────────────┐
│ ✏️  Edit Node        Enter │
│ 📋  Duplicate       Ctrl+D │
├────────────────────────────┤
│ 🔒  Lock Node           L  │
├────────────────────────────┤
│ ✂️  Cut             Ctrl+X │
│ 📋  Copy            Ctrl+C │
├────────────────────────────┤
│ 🗑️  Delete            Del  │  ← Red text
└────────────────────────────┘
```

### Styling

- Background: Semi-transparent dark (match app theme)
- Border: Subtle border with shadow
- Text: Clear, readable
- Icons: Consistent icon set (Lucide or similar)
- Hover: Highlight row on hover
- Disabled: Grayed out text
- Danger: Red text for destructive actions

---

## File Creation Checklist

### Components
- [ ] `apps/web/src/components/context-menu/ContextMenu.tsx`
- [ ] `apps/web/src/components/context-menu/ContextMenuItem.tsx`
- [ ] `apps/web/src/components/context-menu/ContextMenuSeparator.tsx`

### Menu Configurations
- [ ] `apps/web/src/components/context-menu/menus/nodeMenu.ts`
- [ ] `apps/web/src/components/context-menu/menus/selectionMenu.ts`
- [ ] `apps/web/src/components/context-menu/menus/paneMenu.ts`
- [ ] `apps/web/src/components/context-menu/menus/edgeMenu.ts`
- [ ] `apps/web/src/components/context-menu/menus/index.ts`

### State & Hooks
- [ ] `apps/web/src/store/contextMenuStore.ts`
- [ ] `apps/web/src/hooks/useNodeActions.ts`
- [ ] `apps/web/src/hooks/usePaneActions.ts`
- [ ] `apps/web/src/hooks/useContextMenu.ts`

### Integration
- [ ] Update `apps/web/src/components/canvas/WorkflowCanvas.tsx`

---

## Success Criteria

1. Right-click on node shows node context menu
2. Right-click on empty canvas shows pane menu with "Add Node" options
3. Right-click on edge shows delete option
4. Right-click on multi-selection shows batch operations
5. Keyboard shortcuts shown in menu items
6. Menu closes on action, click outside, or Escape
7. Keyboard navigation works (arrows, Enter)
8. All actions work correctly (delete, duplicate, lock, etc.)
9. Menu positions correctly near mouse without going off-screen

---

## Edge Cases

1. **Menu near screen edge:** Flip menu direction to stay on screen
2. **No nodes selected:** Disable batch operations
3. **Locked node:** Show "Unlock" instead of "Lock"
4. **Empty clipboard:** Disable "Paste" option

---

## Dependencies

- React Flow event handlers
- Zustand for state management
- Existing workflow store

---

## Estimated Complexity

- ContextMenu component: ~150 lines
- Menu configurations: ~100 lines
- Store and hooks: ~150 lines
- Integration: ~50 lines
- Total: ~450 lines of code
