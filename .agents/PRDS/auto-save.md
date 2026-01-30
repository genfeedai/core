# PRD: Auto-Save Workflow

**Status:** Planning
**Priority:** High
**Complexity:** Low
**Created:** 2026-01-15
**Category:** UX / Data Persistence

---

## Executive Summary

Automatically save the workflow canvas to the API after 5 seconds of user inactivity. This prevents data loss and removes the cognitive burden of manually saving. Users should see subtle feedback when auto-save occurs.

---

## Current State

- **Manual save only:** Users must explicitly save via toolbar button
- **No auto-save:** Changes can be lost on browser close/crash
- **isDirty flag exists:** `workflowStore.isDirty` tracks unsaved changes
- **Save API ready:** `workflowStore.saveWorkflow()` handles create/update

---

## User Stories

1. **As a user**, I want my workflow to save automatically so I don't lose work
2. **As a user**, I want to see when auto-save happens without it being intrusive
3. **As a user**, I want to disable auto-save if I prefer manual control
4. **As a user**, I want auto-save to only trigger after I stop making changes

---

## Technical Implementation

### Phase 1: Auto-Save Hook

#### Task 1.1: Create useAutoSave Hook
**File:** `apps/web/src/hooks/useAutoSave.ts`

```typescript
interface UseAutoSaveOptions {
  delay?: number;              // Default: 5000ms
  enabled?: boolean;           // Default: true
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
}
```

**Implementation:**
```typescript
export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveReturn {
  const { delay = 5000, enabled = true } = options;

  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !isDirty || isSaving) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for 5s inactivity
    timeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      try {
        await saveWorkflow(abortControllerRef.current.signal);
        setLastSavedAt(new Date());
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Handle error
        }
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isDirty, enabled, isSaving, delay, saveWorkflow]);

  return { isSaving, lastSavedAt, saveNow: () => saveWorkflow() };
}
```

---

### Phase 2: UI Integration

#### Task 2.1: Add Auto-Save Indicator to Toolbar
**File:** `apps/web/src/components/Toolbar.tsx`

Add subtle indicator showing:
- Save status icon (cloud with checkmark when saved, spinning when saving)
- "Saving..." text during save
- "Saved" text briefly after successful save
- "Unsaved changes" when dirty

```typescript
// In Toolbar component
const { isSaving, lastSavedAt } = useAutoSave({ enabled: autoSaveEnabled });

// Indicator states:
// - isDirty && !isSaving → "Unsaved changes" (gray dot)
// - isSaving → "Saving..." (spinner)
// - !isDirty && lastSavedAt → "Saved" (green checkmark, fades after 2s)
```

#### Task 2.2: Add Auto-Save Toggle to UI Store
**File:** `apps/web/src/store/uiStore.ts`

```typescript
interface UIState {
  // ... existing state
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
}
```

Persist preference in localStorage.

#### Task 2.3: Add Toggle to Settings/Toolbar
Allow users to enable/disable auto-save:
- Settings panel toggle, OR
- Toolbar indicator click to toggle

---

## UI/UX Design

### Auto-Save Indicator States

| State | Icon | Text | Color |
|-------|------|------|-------|
| Clean (saved) | Cloud ✓ | "Saved" | Green (fades) |
| Dirty (unsaved) | Cloud | "Unsaved" | Gray |
| Saving | Cloud ↻ | "Saving..." | Blue |
| Error | Cloud ✕ | "Save failed" | Red |

### Behavior Rules

1. **5-second debounce:** Timer resets on each change
2. **No save on empty workflow:** Don't auto-save if no nodes exist
3. **Silent on first load:** Don't show "Saved" indicator on page load
4. **Error retry:** On save error, retry after 10 seconds
5. **Offline handling:** Queue save for when online (optional v2)

---

## Files to Create/Modify

### New Files
- [ ] `apps/web/src/hooks/useAutoSave.ts` - Auto-save hook

### Modified Files
- [ ] `apps/web/src/store/uiStore.ts` - Add autoSaveEnabled state
- [ ] `apps/web/src/components/Toolbar.tsx` - Add save indicator
- [ ] `apps/web/src/app/page.tsx` - Initialize useAutoSave hook

---

## Success Criteria

1. [ ] Workflow saves automatically 5 seconds after last change
2. [ ] Save indicator shows current status (saving/saved/unsaved)
3. [ ] Auto-save can be toggled on/off
4. [ ] Preference persists across sessions (localStorage)
5. [ ] No duplicate saves (debouncing works correctly)
6. [ ] AbortController cleanup on unmount
7. [ ] Error handling with retry logic

---

## Out of Scope (Future Considerations)

- Offline queue with IndexedDB
- Conflict resolution for multi-tab editing
- Version history / undo across sessions
- Collaborative real-time editing

---

## Open Questions

1. **Where to show toggle?** Toolbar vs Settings panel
2. **Show toast on save?** Subtle indicator preferred over toast
3. **Error notification?** Toast for errors, indicator for success

---

## Dependencies

- Existing: `workflowStore.saveWorkflow()`
- Existing: `workflowStore.isDirty`
- Existing: `workflowStore.isSaving`
