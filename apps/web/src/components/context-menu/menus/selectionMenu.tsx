import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Copy,
  Group,
  Lock,
  LockOpen,
  Trash2,
} from 'lucide-react';
import { type ContextMenuItemConfig, createSeparator } from '@/components/context-menu/ContextMenu';

interface SelectionMenuOptions {
  nodeIds: string[];
  onGroup: (nodeIds: string[]) => void;
  onDuplicateAll: (nodeIds: string[]) => void;
  onLockAll: (nodeIds: string[]) => void;
  onUnlockAll: (nodeIds: string[]) => void;
  onAlignHorizontal: (nodeIds: string[]) => void;
  onAlignVertical: (nodeIds: string[]) => void;
  onDeleteAll: (nodeIds: string[]) => void;
}

export function getSelectionMenuItems({
  nodeIds,
  onGroup,
  onDuplicateAll,
  onLockAll,
  onUnlockAll,
  onAlignHorizontal,
  onAlignVertical,
  onDeleteAll,
}: SelectionMenuOptions): ContextMenuItemConfig[] {
  const count = nodeIds.length;

  return [
    {
      id: 'group',
      label: 'Create Group',
      icon: <Group className="w-4 h-4" />,
      shortcut: '⌘G',
      onClick: () => onGroup(nodeIds),
    },
    {
      id: 'duplicate-all',
      label: `Duplicate ${count} Nodes`,
      icon: <Copy className="w-4 h-4" />,
      shortcut: '⌘D',
      onClick: () => onDuplicateAll(nodeIds),
    },
    createSeparator('separator-1'),
    {
      id: 'lock-all',
      label: 'Lock All',
      icon: <Lock className="w-4 h-4" />,
      shortcut: 'L',
      onClick: () => onLockAll(nodeIds),
    },
    {
      id: 'unlock-all',
      label: 'Unlock All',
      icon: <LockOpen className="w-4 h-4" />,
      onClick: () => onUnlockAll(nodeIds),
    },
    createSeparator('separator-2'),
    {
      id: 'align-horizontal',
      label: 'Align Horizontally',
      icon: <AlignHorizontalJustifyCenter className="w-4 h-4" />,
      onClick: () => onAlignHorizontal(nodeIds),
    },
    {
      id: 'align-vertical',
      label: 'Align Vertically',
      icon: <AlignVerticalJustifyCenter className="w-4 h-4" />,
      onClick: () => onAlignVertical(nodeIds),
    },
    createSeparator('separator-3'),
    {
      id: 'delete-all',
      label: `Delete ${count} Nodes`,
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: '⌫',
      danger: true,
      onClick: () => onDeleteAll(nodeIds),
    },
  ];
}
