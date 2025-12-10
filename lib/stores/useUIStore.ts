import { create } from "zustand";

type MenuType = "inventory" | "quests" | "map" | "settings" | null;

interface UIState {
  // Menu state
  activeMenu: MenuType;
  isPaused: boolean;

  // HUD visibility
  showHUD: boolean;
  showMinimap: boolean;
  showQuestTracker: boolean;

  // Dialog
  activeDialog: {
    npcId: string;
    npcName: string;
    text: string;
    options: { id: string; text: string }[];
  } | null;

  // Notifications
  notifications: {
    id: string;
    type: "info" | "success" | "warning" | "error";
    message: string;
    timestamp: number;
  }[];

  // Actions
  openMenu: (menu: MenuType) => void;
  closeMenu: () => void;
  togglePause: () => void;
  setHUDVisibility: (show: boolean) => void;
  toggleMinimap: () => void;
  toggleQuestTracker: () => void;
  openDialog: (dialog: UIState["activeDialog"]) => void;
  closeDialog: () => void;
  addNotification: (
    type: UIState["notifications"][0]["type"],
    message: string
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  activeMenu: null,
  isPaused: false,
  showHUD: true,
  showMinimap: true,
  showQuestTracker: true,
  activeDialog: null,
  notifications: [],

  // Actions
  openMenu: (menu) =>
    set({
      activeMenu: menu,
      isPaused: menu !== null,
    }),

  closeMenu: () =>
    set({
      activeMenu: null,
      isPaused: false,
    }),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
      activeMenu: state.isPaused ? null : "settings",
    })),

  setHUDVisibility: (show) => set({ showHUD: show }),

  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

  toggleQuestTracker: () =>
    set((state) => ({ showQuestTracker: !state.showQuestTracker })),

  openDialog: (dialog) =>
    set({
      activeDialog: dialog,
      isPaused: true,
    }),

  closeDialog: () =>
    set({
      activeDialog: null,
      isPaused: false,
    }),

  addNotification: (type, message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: Math.random().toString(36).slice(2),
          type,
          message,
          timestamp: Date.now(),
        },
      ].slice(-5), // Keep only last 5 notifications
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
