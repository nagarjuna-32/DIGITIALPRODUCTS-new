import { create } from 'zustand';

export interface UserAccessRecord {
  accessType: 'SINGLE_CATEGORY' | 'FULL_VAULT';
  categoryId?: string | null;
  expiresAt?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  accessList?: UserAccessRecord[];
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),

  initialize: async () => {
    try {
      set({ isLoading: true });
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('dv_auth_token') : null;
      
      if (storedToken) {
        set({ token: storedToken, isAuthenticated: true });
        // Fetch fresh profile details from backend
        await get().fetchProfile();
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to initialize auth store:', err);
      get().logout();
    } finally {
      set({ isLoading: false });
    }
  },

  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dv_auth_token', token);
    }
    set({ token, user, isAuthenticated: true, error: null });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dv_auth_token');
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        set({ user: data.user, error: null });
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or user suspended
        get().logout();
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  },
}));
