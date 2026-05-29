import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  init: () => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');

    if (token && user) {
      set({
        user: JSON.parse(user),
        isAuthenticated: true,
        isInitialized: true,
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });

    try {
      const res = await authAPI.login(credentials);
      const { access, refresh, user } = res.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      return {
        success: true,
        role: user.role,
        user,
      };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });

    try {
      const res = await authAPI.register(data);
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.clear();
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },
}));

export default useAuthStore;