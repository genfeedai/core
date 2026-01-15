import type {
  ICreatePromptLibraryItem,
  IPromptLibraryItem,
  IQueryPromptLibrary,
  PromptCategory,
} from '@genfeedai/types';
import { create } from 'zustand';
import { promptLibraryApi } from '@/lib/api';

interface PromptLibraryStore {
  // State
  items: IPromptLibraryItem[];
  featuredItems: IPromptLibraryItem[];
  selectedItem: IPromptLibraryItem | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  categoryFilter: PromptCategory | null;

  // Quick picker state (for dropdown in nodes)
  isPickerOpen: boolean;

  // Modal state
  isCreateModalOpen: boolean;
  editingItem: IPromptLibraryItem | null;

  // Actions - UI
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: PromptCategory | null) => void;
  setSelectedItem: (item: IPromptLibraryItem | null) => void;
  openPicker: () => void;
  closePicker: () => void;
  openCreateModal: (editItem?: IPromptLibraryItem) => void;
  closeCreateModal: () => void;

  // Actions - API
  loadItems: (query?: IQueryPromptLibrary, signal?: AbortSignal) => Promise<void>;
  loadFeatured: (signal?: AbortSignal) => Promise<void>;
  createItem: (data: ICreatePromptLibraryItem, signal?: AbortSignal) => Promise<IPromptLibraryItem>;
  updateItem: (
    id: string,
    data: Partial<ICreatePromptLibraryItem>,
    signal?: AbortSignal
  ) => Promise<IPromptLibraryItem>;
  deleteItem: (id: string, signal?: AbortSignal) => Promise<void>;
  duplicateItem: (id: string, signal?: AbortSignal) => Promise<IPromptLibraryItem>;
  recordItemUsage: (id: string, signal?: AbortSignal) => Promise<IPromptLibraryItem>;
}

export const usePromptLibraryStore = create<PromptLibraryStore>((set, get) => ({
  // Initial state
  items: [],
  featuredItems: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  categoryFilter: null,
  isPickerOpen: false,
  isCreateModalOpen: false,
  editingItem: null,

  // UI Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  setSelectedItem: (item) => set({ selectedItem: item }),

  openPicker: () => set({ isPickerOpen: true }),

  closePicker: () => set({ isPickerOpen: false }),

  openCreateModal: (editItem) =>
    set({
      isCreateModalOpen: true,
      editingItem: editItem ?? null,
    }),

  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      editingItem: null,
    }),

  // API Actions
  loadItems: async (query, signal) => {
    set({ isLoading: true, error: null });
    try {
      const { searchQuery, categoryFilter } = get();
      const finalQuery: IQueryPromptLibrary = {
        ...query,
        search: query?.search ?? (searchQuery || undefined),
        category: query?.category ?? categoryFilter ?? undefined,
      };
      const items = await promptLibraryApi.getAll(finalQuery, signal);
      set({ items, isLoading: false });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        set({ error: (error as Error).message, isLoading: false });
      }
    }
  },

  loadFeatured: async (signal) => {
    try {
      const featuredItems = await promptLibraryApi.getFeatured(10, signal);
      set({ featuredItems });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to load featured items:', error);
      }
    }
  },

  createItem: async (data, signal) => {
    set({ isLoading: true, error: null });
    try {
      const item = await promptLibraryApi.create(data, signal);
      set((state) => ({
        items: [item, ...state.items],
        isLoading: false,
        isCreateModalOpen: false,
        editingItem: null,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateItem: async (id, data, signal) => {
    set({ isLoading: true, error: null });
    try {
      const item = await promptLibraryApi.update(id, data, signal);
      set((state) => ({
        items: state.items.map((i) => (i._id === id ? item : i)),
        selectedItem: state.selectedItem?._id === id ? item : state.selectedItem,
        isLoading: false,
        isCreateModalOpen: false,
        editingItem: null,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteItem: async (id, signal) => {
    try {
      await promptLibraryApi.delete(id, signal);
      set((state) => ({
        items: state.items.filter((i) => i._id !== id),
        selectedItem: state.selectedItem?._id === id ? null : state.selectedItem,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  duplicateItem: async (id, signal) => {
    try {
      const item = await promptLibraryApi.duplicate(id, signal);
      set((state) => ({
        items: [item, ...state.items],
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  recordItemUsage: async (id, signal) => {
    try {
      const item = await promptLibraryApi.use(id, signal);
      set((state) => ({
        items: state.items.map((i) => (i._id === id ? item : i)),
        isPickerOpen: false,
      }));
      return item;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
