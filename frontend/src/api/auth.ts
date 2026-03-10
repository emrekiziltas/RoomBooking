import api from './axios';
import type { AuthResponse } from '../types/index';
import { create } from 'zustand'; // <-- Bunu ekle
import { persist } from 'zustand/middleware';

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation: password,
  });
  return response.data;
};
interface AuthState {
  user: {
    id: number;
    name: string;
    role: string; // <-- Rol burada tanımlı olmalı
  } | null;
  token: string | null;
  setAuth: (user: any, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;

}
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      
      setAuth: (user, token) => set({ user, token }),
      
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('auth-storage'); // Temiz bir çıkış için
      },

      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user;
      }
    }),
    {
      name: 'auth-storage', // LocalStorage anahtar adı
    }
  )
);

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};