import { create } from 'zustand';

export type ModalType =
  | 'templates'
  | 'cost'
  | 'welcome'
  | 'settings'
  | 'promptLibrary'
  | 'modelBrowser'
  | null;

interface UIStore {
  // Panel visibility
  showPalette: boolean;
  showConfigPanel: boolean;
  showMinimap: boolean;
  showAIGenerator: boolean;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Modals
  activeModal: ModalType;

  // Notifications
  notifications: Notification[];

  // Auto-save
  autoSaveEnabled: boolean;

  // Actions
  togglePalette: () => void;
  toggleConfigPanel: () => void;
  toggleMinimap: () => void;
  toggleAIGenerator: () => void;
  toggleAutoSave: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let notificationId = 0;

export const useUIStore = create<UIStore>((set) => ({
  showPalette: true,
  showConfigPanel: true,
  showMinimap: true,
  showAIGenerator: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeModal: null,
  notifications: [],
  autoSaveEnabled:
    typeof window !== 'undefined' ? localStorage.getItem('autoSaveEnabled') !== 'false' : true,

  togglePalette: () => {
    set((state) => ({ showPalette: !state.showPalette }));
  },

  toggleConfigPanel: () => {
    set((state) => ({ showConfigPanel: !state.showConfigPanel }));
  },

  toggleMinimap: () => {
    set((state) => ({ showMinimap: !state.showMinimap }));
  },

  toggleAIGenerator: () => {
    set((state) => ({ showAIGenerator: !state.showAIGenerator }));
  },

  toggleAutoSave: () => {
    set((state) => {
      const newValue = !state.autoSaveEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem('autoSaveEnabled', String(newValue));
      }
      return { autoSaveEnabled: newValue };
    });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  openModal: (modal) => {
    set({ activeModal: modal });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  addNotification: (notification) => {
    const id = `notification-${++notificationId}`;
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));

    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, notification.duration ?? 5000);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
