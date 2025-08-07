import { create } from 'zustand';

type PanelType = 'episode' | 'reference' | null;


interface UIStoreState {
  openPanel: PanelType;
  togglePanel: (panel: PanelType) => void;
  setOpenPanel: (panel: PanelType) => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  openPanel: null,
  setOpenPanel: (panel) => set({ openPanel: panel }),
  togglePanel: (panel) => {
    const { openPanel } = get();
    set({ openPanel: openPanel === panel ? null : panel });
  },
}));

// ...existing code...
