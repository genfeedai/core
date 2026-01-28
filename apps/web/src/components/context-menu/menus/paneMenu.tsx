import { getNodesByCategory, type NodeCategory } from '@genfeedai/types';
import {
  ArrowLeftFromLine,
  ArrowRightToLine,
  AudioLines,
  Brain,
  CheckCircle,
  Clipboard,
  Crop,
  FileText,
  FileVideo,
  Film,
  GitBranch,
  Grid3X3,
  Image,
  Layers,
  LayoutGrid,
  type LucideIcon,
  Maximize,
  Maximize2,
  MessageSquare,
  Mic,
  Monitor,
  Navigation,
  Pencil,
  Scissors,
  Sparkles,
  Subtitles,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import { type ContextMenuItemConfig, createSeparator } from '@/components/context-menu/ContextMenu';

// Icon mapping from node definition icon strings to Lucide components
const NODE_ICONS: Record<string, LucideIcon> = {
  Image,
  MessageSquare,
  FileText,
  Volume2,
  FileVideo,
  Sparkles,
  Video,
  Brain,
  Mic,
  AudioLines,
  Navigation,
  Maximize2,
  Wand2,
  Layers,
  Scissors,
  Film,
  Crop,
  Maximize,
  Grid3X3,
  Pencil,
  Subtitles,
  CheckCircle,
  ArrowRightToLine,
  ArrowLeftFromLine,
  GitBranch,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  input: 'Input',
  ai: 'AI Generation',
  processing: 'Processing',
  output: 'Output',
  composition: 'Composition',
};

const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  input: Image,
  ai: Sparkles,
  processing: Wand2,
  output: Monitor,
  composition: GitBranch,
};

interface PaneMenuOptions {
  screenX: number;
  screenY: number;
  hasClipboard: boolean;
  onAddNode: (type: string, screenX: number, screenY: number) => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
}

export function getPaneMenuItems({
  screenX,
  screenY,
  hasClipboard,
  onAddNode,
  onPaste,
  onSelectAll,
  onFitView,
  onAutoLayout,
}: PaneMenuOptions): ContextMenuItemConfig[] {
  const nodesByCategory = getNodesByCategory();
  // Filter out categories with no nodes (e.g., deprecated 'output' category)
  const categories = (
    ['input', 'ai', 'processing', 'output', 'composition'] as NodeCategory[]
  ).filter((cat) => nodesByCategory[cat].length > 0);

  // Generate category submenus with all nodes
  const addNodeItems: ContextMenuItemConfig[] = categories.map((category) => {
    const CategoryIcon = CATEGORY_ICONS[category];
    const nodes = nodesByCategory[category];

    return {
      id: `add-${category}`,
      label: CATEGORY_LABELS[category],
      icon: <CategoryIcon className="w-4 h-4" />,
      submenu: nodes.map((node) => {
        const NodeIcon = NODE_ICONS[node.icon] ?? Sparkles;
        return {
          id: `add-${node.type}`,
          label: node.label,
          icon: <NodeIcon className="w-4 h-4" />,
          onClick: () => onAddNode(node.type, screenX, screenY),
        };
      }),
    };
  });

  return [
    ...addNodeItems,
    createSeparator('separator-1'),
    {
      id: 'paste',
      label: 'Paste',
      icon: <Clipboard className="w-4 h-4" />,
      shortcut: '⌘V',
      disabled: !hasClipboard,
      onClick: onPaste,
    },
    createSeparator('separator-2'),
    {
      id: 'select-all',
      label: 'Select All',
      shortcut: '⌘A',
      onClick: onSelectAll,
    },
    {
      id: 'fit-view',
      label: 'Fit View',
      icon: <Maximize className="w-4 h-4" />,
      shortcut: 'F',
      onClick: onFitView,
    },
    {
      id: 'auto-layout',
      label: 'Auto-layout Nodes',
      icon: <LayoutGrid className="w-4 h-4" />,
      shortcut: 'L',
      onClick: onAutoLayout,
    },
  ];
}
