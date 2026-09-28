import { create } from 'zustand';

interface GuideState {
  isOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  isOpen: false,
  openGuide: () => set({ isOpen: true }),
  closeGuide: () => set({ isOpen: false }),
}));
