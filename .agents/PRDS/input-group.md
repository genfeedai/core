# Input Group Component System

**Status:** Complete
**Priority:** Medium
**Created:** 2026-01-14
**Updated:** 2026-01-14
**Category:** UI Components

---

## Overview

### Problem Statement
The content-workflow visual editor has node configuration panels with form inputs that need grouping and contextual actions. Currently, ConfigPanel and node components use inline HTML inputs without a standardized grouping system. There's no reusable way to add contextual actions (add/remove rows, copy values, etc.) to input groups.

### Goals
- Create a reusable InputGroup component system for the workflow editor
- Support multiple use cases: form sections, inline editing, dynamic lists, composite values
- Provide standardized contextual actions with multiple UI patterns
- Integrate seamlessly with Zustand store patterns
- Ensure accessibility and keyboard navigation
- Keep zero external dependencies (standalone project)

### Non-Goals
- External platform dependencies
- Backend validation (handled separately)
- Complex form state management (use Zustand directly)

## User Stories

### Primary User Story
**As a** workflow builder user
**I want** grouped inputs with quick actions in the config panel
**So that** I can efficiently configure nodes with complex settings

### Additional Stories
- As a user, I want to add/remove variable key-value pairs in nodes
- As a user, I want quick actions (copy, reset) visible on hover
- As a user, I want to collapse config sections to reduce clutter
- As a developer, I want reusable composites for common patterns

## Requirements

### Functional Requirements
- FR-001: Support 4 use cases - form sections, inline editing, dynamic lists, composite values
- FR-002: Support 4 action UI patterns - hover toolbar, context menu, inline buttons, dropdown menu
- FR-003: Action categories: CRUD (add, duplicate, delete, reorder), AI (enhance, generate), Data (copy, paste), Validation (validate, reset)
- FR-004: Collapsible sections with expand/collapse toggle
- FR-005: Inline editing mode with save/cancel actions
- FR-006: Dynamic list with min/max items, sortable rows
- FR-007: Integration with Zustand store patterns

### Non-Functional Requirements
- NFR-001: Accessible - keyboard navigation, ARIA attributes, screen reader support
- NFR-002: Performance - memoized components, efficient re-renders
- NFR-003: Consistent styling with project CSS variables

## Technical Design

### Component Architecture
- InputGroup - Main container with group-level features
- InputGroupHeader - Title, description, collapse toggle
- InputGroupField - Field wrapper with label, error, actions
- InputGroupRow - Single row for dynamic lists
- DynamicList - Array management component
- ActionToolbar - Horizontal/vertical action buttons
- ActionMenu - Three-dot dropdown menu
- Pre-built composites: KeyValueList, DimensionsGroup

### Key Interfaces
- ActionConfig: id, type, category, label, icon, shortcut, disabled, onClick
- InputGroupProps: id, title, description, variant, collapsible, actions, actionPattern
- InputGroupFieldProps: id, label, error, actions, width
- DynamicListProps: items, minItems, maxItems, sortable, renderRow, onChange

## Success Metrics
- All 4 use cases supported with working examples
- All 4 action UI patterns functional
- Keyboard accessible (tab navigation, shortcuts)
- Passes TypeScript strict mode
- Zero external platform dependencies

## Dependencies (internal only)
- @content-workflow/types (workspace)
- Tailwind CSS (existing)
- lucide-react for icons (existing)
- Zustand for state (existing)

## Notes
- Follow existing ContextMenu.tsx patterns for action menus
- Use CSS variables from globals.scss for theming
- Consider @dnd-kit for drag-and-drop in dynamic lists (optional)
