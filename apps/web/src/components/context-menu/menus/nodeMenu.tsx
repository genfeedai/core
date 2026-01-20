import { Copy, Lock, LockOpen, Scissors, Trash2 } from 'lucide-react';
import { type ContextMenuItemConfig, createSeparator } from '@/components/context-menu/ContextMenu';

interface NodeMenuOptions {
  nodeId: string;
  isLocked: boolean;
  onDuplicate: (nodeId: string) => void;
  onLock: (nodeId: string) => void;
  onUnlock: (nodeId: string) => void;
  onCut: (nodeId: string) => void;
  onCopy: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

export function getNodeMenuItems({
  nodeId,
  isLocked,
  onDuplicate,
  onLock,
  onUnlock,
  onCut,
  onCopy,
  onDelete,
}: NodeMenuOptions): ContextMenuItemConfig[] {
  return [
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      shortcut: '⌘D',
      onClick: () => onDuplicate(nodeId),
    },
    createSeparator('separator-1'),
    isLocked
      ? {
          id: 'unlock',
          label: 'Unlock Node',
          icon: <LockOpen className="w-4 h-4" />,
          shortcut: 'L',
          onClick: () => onUnlock(nodeId),
        }
      : {
          id: 'lock',
          label: 'Lock Node',
          icon: <Lock className="w-4 h-4" />,
          shortcut: 'L',
          onClick: () => onLock(nodeId),
        },
    createSeparator('separator-2'),
    {
      id: 'cut',
      label: 'Cut',
      icon: <Scissors className="w-4 h-4" />,
      shortcut: '⌘X',
      onClick: () => onCut(nodeId),
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      shortcut: '⌘C',
      onClick: () => onCopy(nodeId),
    },
    createSeparator('separator-3'),
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: '⌫',
      danger: true,
      onClick: () => onDelete(nodeId),
    },
  ];
}
