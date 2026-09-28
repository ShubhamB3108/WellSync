import { create } from 'zustand';
import { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

const getStoredAuth = () => {
  try {
    const token = localStorage.getItem('wellsync_access_token');
    const refresh = localStorage.getItem('wellsync_refresh_token');
    const rawUser = localStorage.getItem('wellsync_user');
    if (token && rawUser) {
      return {
        accessToken: token,
        refreshToken: refresh,
        user: JSON.parse(rawUser) as User,
        isAuthenticated: true,
      };
    }
  } catch (e) {
    console.error('Error loading stored auth:', e);
  }
  return {
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  };
};

export const useAuthStore = create<AuthState>((set) => {
  const initial = getStoredAuth();
  return {
    ...initial,
    login: (data: AuthResponse) => {
      const user: User = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        is_active: true,
      };
      localStorage.setItem('wellsync_access_token', data.access_token);
      localStorage.setItem('wellsync_refresh_token', data.refresh_token);
      localStorage.setItem('wellsync_user', JSON.stringify(user));
      set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user,
        isAuthenticated: true,
      });
    },
    logout: () => {
      localStorage.removeItem('wellsync_access_token');
      localStorage.removeItem('wellsync_refresh_token');
      localStorage.removeItem('wellsync_user');
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      });
    },
    setAccessToken: (token: string) => {
      localStorage.setItem('wellsync_access_token', token);
      set({ accessToken: token });
    },
  };
});
