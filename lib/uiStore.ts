import { create } from 'zustand';

type PanelType = 'episode' | 'reference';

interface UIStoreState {
  activePanel: PanelType | null;
  openEpisodePanel: () => void;
  openReferencePanel: () => void;
  closePanel: () => void;
  switchPanel: (panel: PanelType) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  activePanel: null,
  openEpisodePanel: () => set({ activePanel: 'episode' }),
  openReferencePanel: () => set({ activePanel: 'reference' }),
  closePanel: () => set({ activePanel: null }),
  switchPanel: (panel) => set({ activePanel: panel }),
}));

