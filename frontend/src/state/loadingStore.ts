import { create } from 'zustand';

interface LoadingState {
  activeRequests: number;
  isLoading: boolean;
  loadingMessage: string | null;
  startRequest: (message?: string) => void;
  endRequest: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  activeRequests: 0,
  isLoading: false,
  loadingMessage: null,
  startRequest: (message?: string) =>
    set((state) => ({
      activeRequests: state.activeRequests + 1,
      isLoading: true,
      loadingMessage: message || state.loadingMessage || 'Loading data from database...',
    })),
  endRequest: () =>
    set((state) => {
      const newCount = Math.max(0, state.activeRequests - 1);
      return {
        activeRequests: newCount,
        isLoading: newCount > 0,
        loadingMessage: newCount > 0 ? state.loadingMessage : null,
      };
    }),
}));
