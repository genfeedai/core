# PRD: Image Annotation Editor

**Status:** Backlog
**Priority:** Medium
**Complexity:** High

---

## Executive Summary

Add a full-screen image annotation editor with drawing tools (rectangles, circles, arrows, freehand, text). Users can annotate generated images within the workflow before passing them to subsequent nodes or exporting.

---

## Current State

- **Image display:** Images shown in OutputNode and ImageGenNode preview
- **Annotation tools:** None
- **Canvas library:** React Flow (for workflow), no drawing canvas

---

## User Stories

1. **As a user**, I want to draw rectangles/circles to highlight areas of generated images
2. **As a user**, I want to add arrows pointing to specific elements
3. **As a user**, I want to add text labels to annotate images
4. **As a user**, I want to freehand draw on images for quick sketches
5. **As a user**, I want to export annotated images
6. **As a user**, I want annotations to be preserved in workflow execution

---

## Technical Implementation

### Phase 1: Annotation Canvas Library Selection

**Recommended:** Fabric.js or Konva.js

| Library | Pros | Cons |
|---------|------|------|
| **Fabric.js** | Rich object model, built-in serialization, great for annotations | Larger bundle size |
| **Konva.js** | React-friendly (react-konva), performant, good docs | Less built-in shapes |

**Decision:** Use **Konva.js** with `react-konva` for React integration.

---

### Phase 2: Core Annotation Editor Component

#### Task 2.1: Create AnnotationEditor Component
**File:** `apps/web/src/components/annotation/AnnotationEditor.tsx`

```typescript
interface AnnotationEditorProps {
  imageUrl: string;
  annotations?: Annotation[];
  onSave: (annotations: Annotation[], dataUrl: string) => void;
  onCancel: () => void;
}

interface Annotation {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text';
  data: ShapeData;
  style: ShapeStyle;
}
```

**Features:**
- Full-screen overlay with image centered
- Toolbar with shape tools
- Drag-to-draw shapes
- Select and modify existing annotations
- Undo/redo support
- Export as PNG with annotations burned in

#### Task 2.2: Create Drawing Tools Toolbar
**File:** `apps/web/src/components/annotation/AnnotationToolbar.tsx`

**Tools:**
- **Select** (pointer) - Select and move annotations
- **Rectangle** - Draw rectangles (with/without fill)
- **Circle/Ellipse** - Draw circles and ellipses
- **Arrow** - Draw directional arrows
- **Freehand** - Freehand drawing/sketching
- **Text** - Add text labels

**Style Controls:**
- Stroke color picker
- Fill color picker (with opacity)
- Stroke width slider
- Font size (for text)

#### Task 2.3: Create Shape Components
**Files:**
- `apps/web/src/components/annotation/shapes/RectangleShape.tsx`
- `apps/web/src/components/annotation/shapes/CircleShape.tsx`
- `apps/web/src/components/annotation/shapes/ArrowShape.tsx`
- `apps/web/src/components/annotation/shapes/FreehandShape.tsx`
- `apps/web/src/components/annotation/shapes/TextShape.tsx`

Each shape component handles:
- Rendering on Konva canvas
- Resize handles when selected
- Property updates (color, size, etc.)

---

### Phase 3: Integration with Workflow

#### Task 3.1: Create AnnotationNode
**File:** `apps/web/src/components/nodes/utility/AnnotationNode.tsx`

A new node type that:
- Accepts image input
- Opens annotation editor on double-click
- Stores annotations in node data
- Outputs annotated image

#### Task 3.2: Add "Annotate" Button to Image Outputs
**File:** `apps/web/src/components/nodes/ai/ImageGenNode.tsx`

Add button to open annotation editor for generated images.

#### Task 3.3: Create useAnnotationStore Hook
**File:** `apps/web/src/store/annotationStore.ts`

```typescript
interface AnnotationState {
  isEditorOpen: boolean;
  currentImage: string | null;
  currentNodeId: string | null;
  annotations: Annotation[];

  openEditor: (imageUrl: string, nodeId: string) => void;
  closeEditor: () => void;
  saveAnnotations: (annotations: Annotation[]) => void;
  // ... undo/redo actions
}
```

---

### Phase 4: Serialization & Export

#### Task 4.1: Annotation Serialization
**File:** `apps/web/src/lib/annotation/serializer.ts`

```typescript
// Serialize annotations for storage
function serializeAnnotations(annotations: Annotation[]): string

// Deserialize from stored format
function deserializeAnnotations(data: string): Annotation[]

// Export canvas as image with annotations
async function exportAnnotatedImage(
  imageUrl: string,
  annotations: Annotation[]
): Promise<Blob>
```

#### Task 4.2: Update Workflow Serialization

Ensure annotation data is saved/loaded with workflows:

```typescript
interface AnnotationNodeData extends BaseNodeData {
  sourceImage: string;
  annotations: Annotation[];
  exportedImage?: string; // Base64 or URL of annotated result
}
```

---

## UI/UX Design

### Editor Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [Close X]                    Image Annotation              [Save] │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐    │
│ │                                                          │    │
│ │                                                          │    │
│ │                    Canvas Area                           │    │
│ │                    (Image + Annotations)                 │    │
│ │                                                          │    │
│ │                                                          │    │
│ └─────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────┤
│ [Select][Rect][Circle][Arrow][Draw][Text] │ Color │ Size │ Undo │
└────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `A` | Arrow tool |
| `D` | Freehand draw |
| `T` | Text tool |
| `Delete` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Escape` | Cancel/Close |
| `Enter` | Save |

---

## File Creation Checklist

### Core Components
- [ ] `apps/web/src/components/annotation/AnnotationEditor.tsx`
- [ ] `apps/web/src/components/annotation/AnnotationToolbar.tsx`
- [ ] `apps/web/src/components/annotation/AnnotationCanvas.tsx`

### Shape Components
- [ ] `apps/web/src/components/annotation/shapes/RectangleShape.tsx`
- [ ] `apps/web/src/components/annotation/shapes/CircleShape.tsx`
- [ ] `apps/web/src/components/annotation/shapes/ArrowShape.tsx`
- [ ] `apps/web/src/components/annotation/shapes/FreehandShape.tsx`
- [ ] `apps/web/src/components/annotation/shapes/TextShape.tsx`
- [ ] `apps/web/src/components/annotation/shapes/index.ts`

### State & Utils
- [ ] `apps/web/src/store/annotationStore.ts`
- [ ] `apps/web/src/lib/annotation/serializer.ts`
- [ ] `apps/web/src/lib/annotation/export.ts`

### Node Integration
- [ ] `apps/web/src/components/nodes/utility/AnnotationNode.tsx`
- [ ] Update `apps/web/src/types/nodes.ts`
- [ ] Update `apps/web/src/components/panels/NodePalette.tsx`

### Dependencies to Install
```bash
cd apps/web
bun add konva react-konva
```

---

## Success Criteria

1. Users can draw rectangles, circles, arrows, freehand, and text on images
2. Annotations can be selected, moved, resized, and deleted
3. Style controls (color, stroke width) work correctly
4. Annotated images can be exported as PNG
5. Annotations persist when saving/loading workflows
6. Undo/redo works for all operations
7. Full-screen mode works on all screen sizes

---

## Dependencies

- Konva.js / react-konva
- Existing image output from ImageGenNode
- Workflow serialization system

---

## Estimated Complexity

- Core editor: ~600-800 lines
- Shape components: ~400 lines
- Integration: ~200 lines
- Total: ~1200-1400 lines of code
