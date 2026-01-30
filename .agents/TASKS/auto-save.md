## Task: Auto-Save Workflow

**ID:** auto-save
**Label:** Auto-Save Workflow
**Description:** Automatically save workflow to API after 5 seconds of inactivity
**Type:** Feature
**Status:** Done
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [auto-save.md](../PRDS/auto-save.md)

---

### Agent Metadata

**Claimed-By:**
**Claimed-At:**
**Completed-At:**

---

### Progress

**Agent-Notes:**


**QA-Checklist:**
- [ ] Code compiles/lints
- [ ] Tests pass (CI)
- [ ] User acceptance
- [ ] Visual review

---

### Rejection History

**Rejection-Count:** 0
**Rejections:**


---

### Implementation

**PR:**
**Branch:** feature/auto-save

---

### Overview

Add automatic workflow saving after 5 seconds of user inactivity. The feature uses a debounced effect that watches `isDirty` state and triggers `saveWorkflow()` when the user stops making changes.

### Requirements

1. Auto-save triggers 5 seconds after last canvas change
2. Visual indicator shows save status (saving/saved/unsaved)
3. User can toggle auto-save on/off
4. Preference persists in localStorage
5. Proper AbortController cleanup on unmount

### Implementation Steps

#### Step 1: Create useAutoSave Hook
**File:** `apps/web/src/hooks/useAutoSave.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';

const AUTO_SAVE_DELAY = 5000; // 5 seconds

export function useAutoSave(enabled = true) {
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const nodes = useWorkflowStore((state) => state.nodes);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Don't save if disabled, not dirty, already saving, or empty workflow
    if (!enabled || !isDirty || isSaving || nodes.length === 0) {
      return;
    }

    // Clear existing timeout on new change
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule save after 5s of inactivity
    timeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        await saveWorkflow(abortControllerRef.current.signal);
        setLastSavedAt(new Date());
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Log error but don't throw - will retry on next change
          console.error('Auto-save failed:', error);
        }
      }
    }, AUTO_SAVE_DELAY);

    // Cleanup on unmount or when deps change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isDirty, enabled, isSaving, saveWorkflow, nodes.length]);

  return { isSaving, lastSavedAt };
}
```

#### Step 2: Add UI Store State
**File:** `apps/web/src/store/uiStore.ts`

Add to interface and store:
```typescript
// Add to UIState interface
autoSaveEnabled: boolean;
toggleAutoSave: () => void;

// Add to create()
autoSaveEnabled: typeof window !== 'undefined'
  ? localStorage.getItem('autoSaveEnabled') !== 'false'
  : true,

toggleAutoSave: () => {
  set((state) => {
    const newValue = !state.autoSaveEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoSaveEnabled', String(newValue));
    }
    return { autoSaveEnabled: newValue };
  });
},
```

#### Step 3: Add Save Indicator to Toolbar
**File:** `apps/web/src/components/Toolbar.tsx`

Add indicator component:
```typescript
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';

function SaveIndicator() {
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const autoSaveEnabled = useUIStore((state) => state.autoSaveEnabled);
  const toggleAutoSave = useUIStore((state) => state.toggleAutoSave);

  if (!autoSaveEnabled) {
    return (
      <button onClick={toggleAutoSave} className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <CloudOff className="h-3.5 w-3.5" />
        <span>Auto-save off</span>
      </button>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-blue-500 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Cloud className="h-3.5 w-3.5" />
        <span>Unsaved</span>
      </div>
    );
  }

  return (
    <button onClick={toggleAutoSave} className="flex items-center gap-1.5 text-green-500 text-xs">
      <Check className="h-3.5 w-3.5" />
      <span>Saved</span>
    </button>
  );
}
```

#### Step 4: Initialize Hook in Page
**File:** `apps/web/src/app/page.tsx`

```typescript
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUIStore } from '@/store/uiStore';

// Inside component
const autoSaveEnabled = useUIStore((state) => state.autoSaveEnabled);
useAutoSave(autoSaveEnabled);
```

### Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/hooks/useAutoSave.ts` | **CREATE** - Auto-save hook |
| `apps/web/src/store/uiStore.ts` | Add `autoSaveEnabled`, `toggleAutoSave` |
| `apps/web/src/components/Toolbar.tsx` | Add `SaveIndicator` component |
| `apps/web/src/app/page.tsx` | Initialize `useAutoSave` hook |

### Testing

- [ ] Make changes to canvas, wait 5s, verify API call fires
- [ ] Make rapid changes, verify only one save after 5s idle
- [ ] Toggle auto-save off, verify no saves occur
- [ ] Refresh page, verify preference persists
- [ ] Close tab during save, verify no errors (AbortController)
- [ ] Empty workflow should not trigger save

### Edge Cases

1. **Empty workflow:** Don't save if `nodes.length === 0`
2. **Already saving:** Don't queue another save while one is in progress
3. **Tab close during save:** AbortController prevents hanging requests
4. **Rapid changes:** Debounce resets on each change
5. **Network error:** Log error, will retry on next change
