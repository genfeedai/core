import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContextMenu } from './useContextMenu';

// Mock stores
const mockOpenNodeMenu = vi.fn();
const mockOpenEdgeMenu = vi.fn();
const mockOpenPaneMenu = vi.fn();
const mockOpenSelectionMenu = vi.fn();
const mockClose = vi.fn();
const mockRemoveEdge = vi.fn();
const mockToggleNodeLock = vi.fn();
const mockCreateGroup = vi.fn();

vi.mock('@/store/contextMenuStore', () => ({
  useContextMenuStore: vi.fn(() => ({
    isOpen: false,
    position: { x: 100, y: 100 },
    menuType: null,
    targetId: null,
    targetIds: null,
    openNodeMenu: mockOpenNodeMenu,
    openEdgeMenu: mockOpenEdgeMenu,
    openPaneMenu: mockOpenPaneMenu,
    openSelectionMenu: mockOpenSelectionMenu,
    close: mockClose,
  })),
}));

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => ({
    nodes: [
      { id: 'node-1', type: 'imageGen', data: { locked: false }, position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'llm', data: { locked: true }, position: { x: 100, y: 0 } },
    ],
    removeEdge: mockRemoveEdge,
    toggleNodeLock: mockToggleNodeLock,
    createGroup: mockCreateGroup,
    workflowId: 'workflow-1',
  }),
}));

vi.mock('./useNodeActions', () => ({
  useNodeActions: () => ({
    clipboard: null,
    deleteNode: vi.fn(),
    duplicate: vi.fn(),
    copyNode: vi.fn(),
    cutNode: vi.fn(),
    deleteMultipleNodes: vi.fn(),
    duplicateMultipleNodes: vi.fn(),
  }),
}));

vi.mock('./usePaneActions', () => ({
  usePaneActions: () => ({
    addNodeAtPosition: vi.fn(),
    selectAll: vi.fn(),
    fitView: vi.fn(),
    autoLayout: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  workflowsApi: {
    setThumbnail: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/context-menu/menus', () => ({
  getNodeMenuItems: vi.fn(() => [{ id: 'node-menu-item', label: 'Node Action' }]),
  getEdgeMenuItems: vi.fn(() => [{ id: 'edge-menu-item', label: 'Edge Action' }]),
  getPaneMenuItems: vi.fn(() => [{ id: 'pane-menu-item', label: 'Pane Action' }]),
  getSelectionMenuItems: vi.fn(() => [{ id: 'selection-menu-item', label: 'Selection Action' }]),
}));

import {
  getEdgeMenuItems,
  getNodeMenuItems,
  getPaneMenuItems,
  getSelectionMenuItems,
} from '@/components/context-menu/menus';
import { useContextMenuStore } from '@/store/contextMenuStore';
const mockedUseContextMenuStore = vi.mocked(useContextMenuStore);
const mockedGetNodeMenuItems = vi.mocked(getNodeMenuItems);
const mockedGetEdgeMenuItems = vi.mocked(getEdgeMenuItems);
const mockedGetPaneMenuItems = vi.mocked(getPaneMenuItems);
const mockedGetSelectionMenuItems = vi.mocked(getSelectionMenuItems);

describe('useContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useContextMenu());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.position).toEqual({ x: 100, y: 100 });
      expect(result.current.menuType).toBeNull();
    });

    it('should return menu functions', () => {
      const { result } = renderHook(() => useContextMenu());

      expect(result.current.openNodeMenu).toBe(mockOpenNodeMenu);
      expect(result.current.openEdgeMenu).toBe(mockOpenEdgeMenu);
      expect(result.current.openPaneMenu).toBe(mockOpenPaneMenu);
      expect(result.current.openSelectionMenu).toBe(mockOpenSelectionMenu);
      expect(result.current.close).toBe(mockClose);
    });
  });

  describe('menuItems', () => {
    it('should return empty array when menuType is null', () => {
      const { result } = renderHook(() => useContextMenu());

      expect(result.current.menuItems).toEqual([]);
    });

    it('should return node menu items when menuType is node', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 100, y: 100 },
        menuType: 'node',
        targetId: 'node-1',
        targetIds: null,
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(mockedGetNodeMenuItems).toHaveBeenCalled();
      expect(result.current.menuItems).toHaveLength(1);
      expect(result.current.menuItems[0].id).toBe('node-menu-item');
    });

    it('should return edge menu items when menuType is edge', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 100, y: 100 },
        menuType: 'edge',
        targetId: 'edge-1',
        targetIds: null,
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(mockedGetEdgeMenuItems).toHaveBeenCalled();
      expect(result.current.menuItems[0].id).toBe('edge-menu-item');
    });

    it('should return pane menu items when menuType is pane', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 200, y: 300 },
        menuType: 'pane',
        targetId: null,
        targetIds: null,
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(mockedGetPaneMenuItems).toHaveBeenCalled();
      expect(result.current.menuItems[0].id).toBe('pane-menu-item');
    });

    it('should return selection menu items when menuType is selection', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 100, y: 100 },
        menuType: 'selection',
        targetId: null,
        targetIds: ['node-1', 'node-2'],
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(mockedGetSelectionMenuItems).toHaveBeenCalled();
      expect(result.current.menuItems[0].id).toBe('selection-menu-item');
    });

    it('should return empty array for node menu without targetId', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 100, y: 100 },
        menuType: 'node',
        targetId: null,
        targetIds: null,
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(result.current.menuItems).toEqual([]);
    });

    it('should return empty array for selection menu without targetIds', () => {
      mockedUseContextMenuStore.mockReturnValue({
        isOpen: true,
        position: { x: 100, y: 100 },
        menuType: 'selection',
        targetId: null,
        targetIds: [],
        openNodeMenu: mockOpenNodeMenu,
        openEdgeMenu: mockOpenEdgeMenu,
        openPaneMenu: mockOpenPaneMenu,
        openSelectionMenu: mockOpenSelectionMenu,
        close: mockClose,
      });

      const { result } = renderHook(() => useContextMenu());

      expect(result.current.menuItems).toEqual([]);
    });
  });
});
