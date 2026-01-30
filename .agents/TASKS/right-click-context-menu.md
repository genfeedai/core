## Task: Right-Click Context Menu

**ID:** right-click-context-menu
**Label:** Right-Click Context Menu
**Description:** Context-aware right-click menus for nodes, edges, and canvas
**Type:** Feature
**Status:** Done
**Priority:** High
**Order:** 2
**Created:** 2026-01-14
**Updated:** 2026-01-14T17:21:00.000Z
**PRD:** [Link](../PRDS/right-click-context-menu.md)

---

## Summary

Implement context-aware right-click menus throughout the workflow canvas.

## Key Deliverables

- [x] Node menu: delete, duplicate, lock, copy/cut
- [x] Pane menu: add nodes, paste, select all
- [x] Edge menu: delete connection
- [x] Multi-selection menu: group, batch operations

## Implementation Notes

### Files Created

**Components:**
- `apps/web/src/components/context-menu/ContextMenu.tsx` - Main context menu component with keyboard navigation
- `apps/web/src/components/context-menu/ContextMenuItem.tsx` - Individual menu item component
- `apps/web/src/components/context-menu/ContextMenuSeparator.tsx` - Separator line component
- `apps/web/src/components/context-menu/index.ts` - Barrel export

**Menu Configurations:**
- `apps/web/src/components/context-menu/menus/nodeMenu.tsx` - Node context menu items
- `apps/web/src/components/context-menu/menus/edgeMenu.tsx` - Edge context menu items
- `apps/web/src/components/context-menu/menus/paneMenu.tsx` - Canvas/pane context menu items
- `apps/web/src/components/context-menu/menus/selectionMenu.tsx` - Multi-selection menu items
- `apps/web/src/components/context-menu/menus/index.ts` - Barrel export

**State & Hooks:**
- `apps/web/src/store/contextMenuStore.ts` - Zustand store for menu state
- `apps/web/src/hooks/useNodeActions.ts` - Node operations (delete, duplicate, copy, cut)
- `apps/web/src/hooks/usePaneActions.ts` - Pane operations (add node, select all, fit view)
- `apps/web/src/hooks/useContextMenu.ts` - Main hook combining all context menu logic
- `apps/web/src/hooks/index.ts` - Barrel export

**Modified:**
- `apps/web/src/store/index.ts` - Added contextMenuStore export
- `apps/web/src/components/canvas/WorkflowCanvas.tsx` - Integrated context menu handlers

### Features Implemented
1. Right-click on node shows node context menu with duplicate, lock/unlock, cut, copy, delete
2. Right-click on empty canvas shows pane menu with add node options, paste, select all, fit view
3. Right-click on edge shows delete option
4. Right-click on multi-selection shows batch operations (group, duplicate all, lock/unlock all, align, delete all)
5. Keyboard shortcuts displayed in menu items
6. Menu closes on action, click outside, or Escape
7. Keyboard navigation works (arrow keys, Enter)
8. Menu positions correctly near mouse without going off-screen
