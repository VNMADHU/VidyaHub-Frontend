import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      schoolId: null,
      loading: false,
      error: null,

      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      login: (user, token, role, schoolId) => {
        set({ user, token, role, schoolId, error: null })
      },

      logout: () => {
        set({ user: null, token: null, role: null, schoolId: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        schoolId: state.schoolId,
      }),
    },
  ),
)

export default useAuthStore
