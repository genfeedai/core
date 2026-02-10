'use client';

import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useUIStore } from '@genfeedai/workflow-ui/stores';
import { Keyboard, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ShortcutItem {
  keys: string;
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { keys: 'Scroll', description: 'Pan canvas', category: 'Navigation' },
  { keys: 'Ctrl + Scroll', description: 'Zoom in/out', category: 'Navigation' },
  { keys: 'F', description: 'Fit view to selection (or all)', category: 'Navigation' },
  { keys: 'M', description: 'Toggle sidebar', category: 'Navigation' },

  // Selection
  { keys: 'Click', description: 'Select node', category: 'Selection' },
  { keys: 'Shift + Click', description: 'Add to selection', category: 'Selection' },
  { keys: 'Drag', description: 'Marquee select', category: 'Selection' },
  { keys: 'Ctrl + A', description: 'Select all nodes', category: 'Selection' },
  { keys: 'Ctrl + F', description: 'Search nodes', category: 'Selection' },

  // Editing
  { keys: 'Ctrl + Z', description: 'Undo', category: 'Editing' },
  { keys: 'Ctrl + Shift + Z', description: 'Redo', category: 'Editing' },
  { keys: 'Ctrl + C', description: 'Copy', category: 'Editing' },
  { keys: 'Ctrl + X', description: 'Cut', category: 'Editing' },
  { keys: 'Ctrl + V', description: 'Paste', category: 'Editing' },
  { keys: 'Ctrl + D', description: 'Duplicate', category: 'Editing' },
  { keys: 'Delete / Backspace', description: 'Delete selected', category: 'Editing' },

  // Nodes
  { keys: 'Shift + I', description: 'Add Image Gen node', category: 'Nodes' },
  { keys: 'Shift + V', description: 'Add Video Gen node', category: 'Nodes' },
  { keys: 'Shift + P', description: 'Add Prompt node', category: 'Nodes' },
  { keys: 'Shift + L', description: 'Add LLM node', category: 'Nodes' },

  // Organization
  { keys: 'L', description: 'Toggle lock on selected', category: 'Organization' },
  { keys: 'Ctrl + G', description: 'Group selected nodes', category: 'Organization' },
  { keys: 'Ctrl + Shift + G', description: 'Ungroup', category: 'Organization' },
  { keys: 'Ctrl + Shift + L', description: 'Unlock all nodes', category: 'Organization' },

  // Help
  { keys: '?', description: 'Show this help', category: 'Help' },
];

const CATEGORIES = ['Navigation', 'Selection', 'Editing', 'Nodes', 'Organization', 'Help'];

export function ShortcutHelpModal() {
  const { activeModal, closeModal } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const isOpen = activeModal === 'shortcutHelp';

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;

    const query = searchQuery.toLowerCase();
    return SHORTCUTS.filter(
      (shortcut) =>
        shortcut.keys.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const groupedShortcuts = useMemo(() => {
    const grouped: Record<string, ShortcutItem[]> = {};
    for (const category of CATEGORIES) {
      const items = filteredShortcuts.filter((s) => s.category === category);
      if (items.length > 0) {
        grouped[category] = items;
      }
    }
    return grouped;
  }, [filteredShortcuts]);

  const handleClose = () => {
    closeModal();
    setSearchQuery('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Keyboard Shortcuts"
      icon={Keyboard}
      maxWidth="max-w-2xl"
    >
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-1">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-secondary rounded border border-border">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No shortcuts found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
