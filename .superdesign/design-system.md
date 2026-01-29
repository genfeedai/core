# Genfeed Design System

**Last Updated:** 2026-01-29
**Project:** Genfeed - AI-first content creation platform

---

## Brand Context

Genfeed is a node-based workflow editor for AI content creation (images, videos, audio). The visual language prioritizes **data flow clarity** over decorative elements.

**Design Philosophy:**
- Data flow is the primary visual language
- Neutral node styling reduces visual noise
- Color communicates data type and state, not decoration
- Professional, tool-like aesthetic (not playful or consumer-y)

---

## Color System

### Base Palette (OKLCH)

```css
/* Dark theme (default) */
--background: oklch(0.09 0 0);      /* Near black */
--foreground: oklch(0.95 0 0);      /* Near white */
--card: oklch(0.12 0 0);            /* Elevated surfaces */
--muted: oklch(0.18 0 0);           /* Subtle backgrounds */
--muted-foreground: oklch(0.6 0 0); /* Secondary text */
--border: oklch(0.22 0 0);          /* Borders, dividers */
--primary: oklch(0.7 0.18 175);     /* Cyan accent */
--destructive: oklch(0.55 0.2 25);  /* Error red */
```

### Data Type Colors (Handle + Edge)

| Type   | CSS Variable        | Value                  | Description           |
|--------|---------------------|------------------------|-----------------------|
| Image  | `--handle-image`    | `oklch(0.75 0.18 75)`  | Golden/amber          |
| Video  | `--handle-video`    | `oklch(0.65 0.2 285)`  | Purple-pink           |
| Text   | `--handle-text`     | `oklch(0.7 0.17 160)`  | Teal                  |
| Audio  | `--handle-audio`    | `oklch(0.7 0.2 330)`   | Pink                  |
| Number | `--handle-number`   | `oklch(0.65 0.2 250)`  | Blue                  |
| Output | `--handle-output`   | `oklch(0.7 0.2 200)`   | Cyan (always)         |

### Node Category Colors (Processing Glow Only)

| Category    | CSS Variable             | Value                  |
|-------------|--------------------------|------------------------|
| Input       | `--category-input`       | `oklch(0.7 0.15 160)`  |
| AI          | `--category-ai`          | `oklch(0.65 0.25 300)` |
| Processing  | `--category-processing`  | `oklch(0.65 0.2 250)`  |
| Output      | `--category-output`      | `oklch(0.75 0.18 70)`  |
| Composition | `--category-composition` | `oklch(0.7 0.2 30)`    |

**Note:** Category colors are used for:
- Processing glow animation (pulsing shadow when node is running)
- Resizer handles when selected
- NOT used for borders or backgrounds (nodes use neutral styling)

---

## Typography

### Font Stack
```css
font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
```

### Scale

| Use Case           | Class                          | Size    |
|--------------------|--------------------------------|---------|
| Modal titles       | `text-lg font-semibold`        | 18px    |
| Panel titles       | `text-sm font-medium`          | 14px    |
| Node labels        | `text-sm font-medium`          | 14px    |
| Body text          | `text-sm`                      | 14px    |
| Labels             | `text-xs text-muted-foreground`| 12px    |
| Micro labels       | `text-[10px]`                  | 10px    |
| Code/mono          | `font-mono text-[11px]`        | 11px    |

---

## Spacing

### Standard Units
- `p-3` (12px) - Panel header/content padding
- `gap-2` (8px) - Standard element gap
- `gap-1.5` (6px) - Tight element gap
- `space-y-2` (8px) - Vertical list spacing
- `space-y-4` (16px) - Section spacing

### Panel Dimensions
- Side panels: `w-80` (320px)
- Modals: `max-w-[600px]`

---

## Components

### Nodes

**Anatomy:**
```
┌─────────────────────────────────────────┐
│ [Icon] Title                    [Lock][Status] │  ← Header (border-b)
├─────────────────────────────────────────┤
│                                         │
│  Content area (p-3)                     │
│                                         │
│  [Progress bar if processing]           │
│  [Error message if failed]              │
│                                         │
└─────────────────────────────────────────┘
   ○ Input handles (left)      Output handles ○ (right)
```

**States:**
- Default: `border-border bg-card`
- Selected: `ring-2 ring-primary`
- Processing: `node-processing` (pulsing glow using category color)
- Dimmed (not in selection path): `opacity-40`
- Locked: `opacity-60` + "LOCKED" badge

**Handle sizing:** `!w-3 !h-3` (12px)

### Edges

**Types (className):**
- `edge-image` → golden stroke
- `edge-video` → purple-pink stroke
- `edge-text` → teal stroke
- `edge-audio` → pink stroke
- `edge-number` → blue stroke

**States:**
- Default: `stroke: var(--muted-foreground)`
- Dimmed: `opacity: 0.25`
- Highlighted: `filter: drop-shadow(0 0 4px currentColor) brightness(1.2)`
- Executing: `stroke-dasharray: 8 4` + flow animation
- Disabled: `opacity: 0.3` + dashed

### Panels

**Structure:**
```tsx
<PanelContainer className="w-80 h-full border-l border-border bg-background flex flex-col">
  {/* Header */}
  <div className="flex items-center justify-between p-3 border-b border-border">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="font-medium text-sm">Panel Title</span>
    </div>
    <div className="flex items-center gap-1">
      {/* Action buttons */}
    </div>
  </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto p-3">
    {/* ... */}
  </div>

  {/* Footer (optional) */}
  <div className="p-3 border-t border-border bg-muted/30">
    {/* ... */}
  </div>
</PanelContainer>
```

**Important:** Always wrap panels in `<PanelContainer>` to prevent React Flow event interference.

### Buttons

**Icon buttons:**
```tsx
<button className="p-1.5 hover:bg-muted rounded transition">
  <Icon className="w-4 h-4 text-muted-foreground" />
</button>
```

**Primary buttons:**
```tsx
<button className="px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition">
  Button
</button>
```

**Toggle switches:**
```tsx
<button className={`relative h-6 w-11 rounded-full transition-colors ${
  isOn ? 'bg-primary' : 'bg-border'
}`}>
  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
    isOn ? 'translate-x-5' : 'translate-x-0'
  }`} />
</button>
```

### Badges

**Count badge:**
```tsx
<span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
  {count}
</span>
```

**Type badge:**
```tsx
<span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded">
  {type}
</span>
```

### Alert/Notice Boxes

**Warning:**
```tsx
<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
  <h4 className="font-medium text-amber-600 dark:text-amber-400">Title</h4>
  <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
    Description
  </p>
</div>
```

**Error:**
```tsx
<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
  <p className="text-xs text-destructive">{error}</p>
</div>
```

### Empty States

```tsx
<div className="text-center py-8 text-muted-foreground">
  <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
  <p className="text-sm font-medium mb-2">Title</p>
  <p className="text-xs">Description</p>
</div>
```

---

## Animations

### Processing Glow
```css
@keyframes processing-glow {
  0%, 100% { box-shadow: 0 0 8px 2px var(--node-color); }
  50% { box-shadow: 0 0 20px 6px var(--node-color); }
}
.node-processing { animation: processing-glow 1.5s ease-in-out infinite; }
```

### Edge Flow
```css
@keyframes edge-flow {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}
```

### Transitions
- Default: `transition` (150ms)
- Opacity/filter: `transition: opacity 0.2s ease, filter 0.2s ease`
- Duration: `transition-all duration-200`

---

## Scrollbar

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--background); }
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
```

---

## Icons

Using **Lucide React** icon library.

**Standard sizes:**
- Small: `w-3 h-3` or `w-3.5 h-3.5`
- Default: `w-4 h-4`
- Large: `w-5 h-5`
- Empty state: `w-12 h-12`

---

## Requirements

### Workflow Canvas
- Nodes must be clearly distinguishable but not visually noisy
- Data flow direction (left → right) should be immediately clear
- Edge colors indicate data type flowing through
- Selection highlights connected edges and dims others

### Panels
- Must not interfere with canvas interactions (use PanelContainer)
- Consistent header/content/footer structure
- 320px width standard

### Accessibility
- Sufficient color contrast (OKLCH values chosen for this)
- Focus rings on interactive elements
- Clear visual states (hover, active, disabled)
