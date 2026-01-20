import { create } from 'zustand';

export type ModalType =
  | 'templates'
  | 'cost'
  | 'welcome'
  | 'settings'
  | 'promptLibrary'
  | 'modelBrowser'
  | 'nodeDetail'
  | null;

export type NodeDetailTab = 'preview' | 'history';

interface UIStore {
  // Panel visibility
  showPalette: boolean;
  showMinimap: boolean;
  showAIGenerator: boolean;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Focus mode (highlight connected nodes)
  highlightedNodeIds: string[];

  // Modals
  activeModal: ModalType;

  // Node detail modal
  nodeDetailNodeId: string | null;
  nodeDetailActiveTab: NodeDetailTab;

  // Notifications
  notifications: Notification[];

  // Actions
  togglePalette: () => void;
  toggleMinimap: () => void;
  toggleAIGenerator: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setHighlightedNodeIds: (ids: string[]) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  openNodeDetailModal: (nodeId: string, tab?: NodeDetailTab) => void;
  closeNodeDetailModal: () => void;
  setNodeDetailTab: (tab: NodeDetailTab) => void;
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
  showMinimap: true,
  showAIGenerator: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedNodeIds: [],
  activeModal: null,
  nodeDetailNodeId: null,
  nodeDetailActiveTab: 'preview',
  notifications: [],

  togglePalette: () => {
    set((state) => ({ showPalette: !state.showPalette }));
  },

  toggleMinimap: () => {
    set((state) => ({ showMinimap: !state.showMinimap }));
  },

  toggleAIGenerator: () => {
    set((state) => ({ showAIGenerator: !state.showAIGenerator }));
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  setHighlightedNodeIds: (ids) => {
    set({ highlightedNodeIds: ids });
  },

  openModal: (modal) => {
    set({ activeModal: modal });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  openNodeDetailModal: (nodeId, tab = 'preview') => {
    set({ activeModal: 'nodeDetail', nodeDetailNodeId: nodeId, nodeDetailActiveTab: tab });
  },

  closeNodeDetailModal: () => {
    set({ activeModal: null, nodeDetailNodeId: null, nodeDetailActiveTab: 'preview' });
  },

  setNodeDetailTab: (tab) => {
    set({ nodeDetailActiveTab: tab });
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
