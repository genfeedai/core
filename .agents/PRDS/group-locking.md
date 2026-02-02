# PRD: Group Locking - Skip Node Groups During Execution

**Status:** Buggy — implemented but has reported issues, needs investigation
**Priority:** Medium
**Complexity:** Low-Medium

---

## Executive Summary

Allow users to "lock" or disable individual nodes or groups of nodes so they are skipped during workflow execution. This enables iterative development where users can test specific parts of a workflow without re-running expensive operations.

---

## Current State

- **Node groups:** No grouping functionality exists
- **Skip/disable:** All nodes execute when workflow runs
- **Execution:** Sequential based on topological sort
- **Existing execution store:** `apps/web/src/store/executionStore.ts`

---

## User Stories

1. **As a user**, I want to disable specific nodes so they don't run during execution
2. **As a user**, I want to lock node groups to preserve their outputs while testing other parts
3. **As a user**, I want to see which nodes are disabled visually
4. **As a user**, I want disabled nodes to use their cached output instead of re-running
5. **As a user**, I want to quickly toggle nodes on/off without deleting them

---

## Technical Implementation

### Phase 1: Node Locking (Individual Nodes)

#### Task 1.1: Add Lock State to Node Data
**File:** `apps/web/src/types/nodes.ts`

```typescript
interface BaseNodeData {
  // ... existing fields
  isLocked?: boolean;       // Node is locked (skipped during execution)
  cachedOutput?: unknown;   // Preserved output from last execution
  lockTimestamp?: number;   // When the node was locked
}
```

#### Task 1.2: Update Execution Store
**File:** `apps/web/src/store/executionStore.ts`

Modify `executeWorkflow()` to skip locked nodes:

```typescript
async function executeWorkflow() {
  const sortedNodes = topologicalSort(nodes, edges);

  for (const node of sortedNodes) {
    if (node.data.isLocked && node.data.cachedOutput) {
      // Use cached output, skip execution
      setNodeResult(node.id, node.data.cachedOutput);
      continue;
    }

    // Execute normally
    await executeNode(node);
  }
}
```

#### Task 1.3: Add Lock Toggle to Node UI
**File:** `apps/web/src/components/nodes/BaseNode.tsx` (or individual node files)

Add lock icon button to node header:
- Unlocked: Node executes normally
- Locked: Node is skipped, shows lock icon, uses cached output

**Visual Indicators:**
- Locked nodes have muted/grayed appearance
- Lock icon visible in node header
- "LOCKED" badge on node

#### Task 1.4: Add Lock Action to Workflow Store
**File:** `apps/web/src/store/workflowStore.ts`

```typescript
interface WorkflowStore {
  // ... existing
  toggleNodeLock: (nodeId: string) => void;
  lockNode: (nodeId: string) => void;
  unlockNode: (nodeId: string) => void;
  lockMultipleNodes: (nodeIds: string[]) => void;
  unlockAllNodes: () => void;
}
```

---

### Phase 2: Node Grouping

#### Task 2.1: Create Group Data Structure
**File:** `apps/web/src/types/groups.ts`

```typescript
interface NodeGroup {
  id: string;
  name: string;
  nodeIds: string[];
  isLocked: boolean;
  color?: string;        // Visual color for group
  collapsed?: boolean;   // Future: collapse group to single node
}
```

#### Task 2.2: Add Groups to Workflow Store
**File:** `apps/web/src/store/workflowStore.ts`

```typescript
interface WorkflowStore {
  // ... existing
  groups: NodeGroup[];

  createGroup: (nodeIds: string[], name?: string) => string;
  deleteGroup: (groupId: string) => void;
  addToGroup: (groupId: string, nodeIds: string[]) => void;
  removeFromGroup: (groupId: string, nodeIds: string[]) => void;
  toggleGroupLock: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
}
```

#### Task 2.3: Visual Group Rendering
**File:** `apps/web/src/components/canvas/GroupOverlay.tsx`

Render visual grouping on canvas:
- Semi-transparent colored background behind grouped nodes
- Group name label
- Lock icon if group is locked
- Resize handles to adjust group bounds

#### Task 2.4: Group Selection UI

Users can create groups by:
1. Multi-selecting nodes (Shift+Click or drag selection)
2. Right-click → "Create Group" (see Context Menu PRD)
3. Keyboard shortcut: `Ctrl+G`

---

### Phase 3: Execution Flow with Locked Groups

#### Task 3.1: Update Execution Logic

```typescript
function shouldSkipNode(node: Node, groups: NodeGroup[]): boolean {
  // Check individual lock
  if (node.data.isLocked) return true;

  // Check if in any locked group
  const inLockedGroup = groups.some(
    group => group.isLocked && group.nodeIds.includes(node.id)
  );

  return inLockedGroup;
}
```

#### Task 3.2: Handle Missing Cached Outputs

When a locked node has no cached output:
1. Show warning indicator on node
2. Option A: Execute anyway (auto-unlock for this run)
3. Option B: Fail with error message
4. Option C: Use placeholder/null value

**Recommended:** Option A with user notification.

---

## UI/UX Design

### Node Lock States

```
┌──────────────────────────────────┐
│ 🔓 Image Generator               │  ← Unlocked (normal)
├──────────────────────────────────┤
│ [Settings...]                    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🔒 Image Generator    [LOCKED]   │  ← Locked (grayed out)
├──────────────────────────────────┤
│ [Using cached output]            │
└──────────────────────────────────┘
```

### Group Visual

```
┌─────────────────────────────────────────────────────┐
│  📁 Image Processing Pipeline       🔒              │
│  ┌─────────────┐    ┌─────────────┐                │
│  │ Image Gen   │───▸│ Upscaler    │                │
│  └─────────────┘    └─────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `L` | Toggle lock on selected node(s) |
| `Ctrl+G` | Create group from selected nodes |
| `Ctrl+Shift+G` | Ungroup selected group |
| `Ctrl+L` | Lock selected group |
| `Ctrl+Shift+L` | Unlock all nodes |

---

## File Creation Checklist

### Types
- [ ] `apps/web/src/types/groups.ts`
- [ ] Update `apps/web/src/types/nodes.ts` (add lock fields)

### Store Updates
- [ ] Update `apps/web/src/store/workflowStore.ts` (add lock/group actions)
- [ ] Update `apps/web/src/store/executionStore.ts` (skip locked nodes)

### Components
- [ ] `apps/web/src/components/canvas/GroupOverlay.tsx`
- [ ] `apps/web/src/components/canvas/GroupBadge.tsx`
- [ ] Update node components (add lock toggle button)

### Serialization
- [ ] Update workflow save/load to include groups
- [ ] Update workflow save/load to include lock states

---

## Success Criteria

1. Users can lock/unlock individual nodes
2. Locked nodes show visual indicator (grayed out, lock icon)
3. Locked nodes are skipped during execution
4. Cached outputs are used for locked nodes
5. Users can create/delete node groups
6. Groups can be locked/unlocked as a unit
7. Lock state persists when saving/loading workflows
8. Keyboard shortcuts work for lock/group operations

---

## Edge Cases

1. **Locked node with no cache:** Execute anyway, notify user
2. **Locked node's input changed:** Warn user cache may be stale
3. **All nodes locked:** Show warning, nothing to execute
4. **Delete node in group:** Remove from group automatically
5. **Lock downstream of unlocked:** Cache may be stale warning

---

## Dependencies

- Existing execution store
- React Flow node structure
- Workflow serialization system

---

## Estimated Complexity

- Node locking: ~200 lines
- Group management: ~300 lines
- UI components: ~200 lines
- Total: ~700 lines of code
