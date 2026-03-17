import api from './axios';
import type { AuthResponse } from '../types/index';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- API FONKSİYONLARI ---

// Google Login için yeni fonksiyon
export const googleLogin = async (googleToken: string): Promise<AuthResponse> => {
  // Backend'inde bu endpoint'in olması gerekir. 
  // Backend, Google token'ı doğrular ve sana kendi sisteminin token+user bilgisini döner.
  const response = await api.post('/auth/google', { token: googleToken });
  return response.data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const logoutApi = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
  }
};

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation: password, // Backend genelde bunu doğrulamak için ister
  });
  return response.data;
};
// --- ZUSTAND STORE ---

interface AuthState {
  user: {
    id: number;
    name: string;
    role: string;
    picture?: string; // Google'dan gelen profil resmini de ekleyelim
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
      
      setAuth: (user, token) => {
        set({ user, token });
        // Axios interceptor'ın token'ı görmesi için genellikle localStorage'a da yazarız
        localStorage.setItem('token', token); 
      },
      
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('token');
      },

      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);