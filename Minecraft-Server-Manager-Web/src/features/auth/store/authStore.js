import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
          });
        } catch(e) {}
        localStorage.removeItem("accessToken");
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
