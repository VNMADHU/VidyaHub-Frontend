import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User } from '@/types'

const initialState: AuthState = {
  user: null,
  token: null,
  role: null,
  schoolId: null,
  loading: false,
  error: null,
}

// Hydrate from localStorage
const STORAGE_KEY = 'auth-store'
try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored)
    if (parsed?.state) {
      initialState.user = parsed.state.user ?? null
      initialState.token = parsed.state.token ?? null
      initialState.role = parsed.state.role ?? null
      initialState.schoolId = parsed.state.schoolId ?? null
    }
  }
} catch {
  // ignore malformed storage
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{
        user: User
        token: string
        role: string
        schoolId: string | null
      }>,
    ) {
      const { user, token, role, schoolId } = action.payload
      state.user = user
      state.token = token
      state.role = role
      state.schoolId = schoolId
      state.error = null
      // Persist to localStorage
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { user, token, role, schoolId },
        }),
      )
    },
    logout(state) {
      state.user = null
      state.token = null
      state.role = null
      state.schoolId = null
      state.error = null
      localStorage.removeItem(STORAGE_KEY)
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
})

export const { login, logout, setUser, setLoading, setError, clearError } = authSlice.actions
export default authSlice.reducer
