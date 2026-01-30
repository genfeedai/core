## Task: Auto-Reorder Blocks

**ID:** auto-reorder-blocks
**Label:** Auto-Reorder Blocks
**Description:** Add an "Auto-Layout" button to automatically reorganize all workflow nodes in a clean, hierarchical layout that minimizes edge crossings and respects execution order.
**Type:** Feature
**Status:** Done
**Priority:** Medium
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [auto-reorder-blocks.md](../PRDS/auto-reorder-blocks.md)

---

## Scope
- Toolbar component (add button)
- workflowStore (add autoLayoutNodes method)
- Graph layout algorithm integration (dagre or similar)
- Optional: Animation for node movement

## Acceptance Criteria
- [ ] Auto-Layout button added to Toolbar
- [ ] Clicking button reorganizes all nodes without edge crossings
- [ ] Layout respects topological execution order
- [ ] All node connections preserved
- [ ] Layout completes in < 500ms for typical workflows
- [ ] Works with disconnected node groups
- [ ] Keyboard shortcut support (Cmd/Ctrl+L)
- [ ] Test coverage > 80%

## Technical Notes
- Use dagre library for graph layout (recommended)
- Integrate with existing topologicalSort from @content-workflow/core
- Update node positions via workflowStore.onNodesChange
- Consider React Flow's fitView after layout
