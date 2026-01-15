## Task: Command Palette

**ID:** command-palette
**Label:** Command Palette
**Description:** Add a command palette (Cmd/Ctrl+K) for quick keyboard-first access to all actions, node creation, navigation, and workflow operations.
**Type:** Feature
**Status:** Backlog
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [command-palette.md](../PRDS/command-palette.md)

---

## Scope
- CommandPalette component with search, keyboard navigation
- Command registry (nodes, actions, navigation, workflow)
- Global keyboard shortcut (Cmd/Ctrl+K)
- Fuzzy search with fuse.js
- Recent commands tracking
- Integration with workflowStore and canvas

## Acceptance Criteria
- [ ] Cmd/Ctrl+K opens command palette from anywhere in workflow editor
- [ ] Fuzzy search filters commands by label and keywords
- [ ] Arrow keys navigate, Enter executes, Escape closes
- [ ] All node types available as "Add Node" commands
- [ ] Action commands work (save, undo, redo, auto-layout)
- [ ] Navigation commands work (fit view, zoom)
- [ ] Workflow commands work (run, stop)
- [ ] Recent commands shown at top of palette
- [ ] Keyboard shortcuts displayed next to commands
- [ ] Works on Mac (Cmd) and Windows (Ctrl)

## Technical Notes
- Consider using `cmdk` library (headless) or custom implementation
- Use `fuse.js` for fuzzy search
- Store recent commands in localStorage
- Use zustand for command palette state
- Integrate with existing workflowStore for node/action operations

## Dependencies
- `fuse.js` (or similar fuzzy search library)
- Optional: `cmdk` (headless command palette)
- workflowStore
- @xyflow/react (for canvas operations)
