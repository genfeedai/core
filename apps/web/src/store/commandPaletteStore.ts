import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CommandPaletteStore {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  recentCommands: string[];

  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  addRecentCommand: (id: string) => void;
  reset: () => void;
}

const MAX_RECENT_COMMANDS = 5;

export const useCommandPaletteStore = create<CommandPaletteStore>()(
  persist(
    (set) => ({
      isOpen: false,
      searchQuery: '',
      selectedIndex: 0,
      recentCommands: [],

      open: () => {
        set({ isOpen: true, searchQuery: '', selectedIndex: 0 });
      },

      close: () => {
        set({ isOpen: false, searchQuery: '', selectedIndex: 0 });
      },

      toggle: () => {
        set((state) => ({
          isOpen: !state.isOpen,
          searchQuery: state.isOpen ? state.searchQuery : '',
          selectedIndex: state.isOpen ? state.selectedIndex : 0,
        }));
      },

      setQuery: (query) => {
        set({ searchQuery: query, selectedIndex: 0 });
      },

      setSelectedIndex: (index) => {
        set({ selectedIndex: index });
      },

      addRecentCommand: (id) => {
        set((state) => {
          const filtered = state.recentCommands.filter((cmd) => cmd !== id);
          return {
            recentCommands: [id, ...filtered].slice(0, MAX_RECENT_COMMANDS),
          };
        });
      },

      reset: () => {
        set({ searchQuery: '', selectedIndex: 0 });
      },
    }),
    {
      name: 'command-palette-storage',
      partialize: (state) => ({ recentCommands: state.recentCommands }),
    }
  )
);
