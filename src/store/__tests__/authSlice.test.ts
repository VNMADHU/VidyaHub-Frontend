import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { login, logout, setLoading, setError, clearError } from '@/store/slices/authSlice'

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer },
  })

describe('authSlice', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('has correct initial state', () => {
    const state = store.getState().auth
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.role).toBeNull()
    expect(state.schoolId).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('handles login action', () => {
    const user = { id: 1, email: 'test@test.com', role: 'admin', schoolId: 1 }
    store.dispatch(login({ user: user as any, token: 'jwt-token-123', role: 'admin', schoolId: '1' }))

    const state = store.getState().auth
    expect(state.user).toEqual(user)
    expect(state.token).toBe('jwt-token-123')
    expect(state.role).toBe('admin')
    expect(state.schoolId).toBe('1')
    expect(state.error).toBeNull()
  })

  it('persists to localStorage on login', () => {
    const user = { id: 1, email: 'test@test.com', role: 'admin', schoolId: 1 }
    store.dispatch(login({ user: user as any, token: 'jwt-token-123', role: 'admin', schoolId: '1' }))

    const stored = JSON.parse(localStorage.getItem('auth-store') || '{}')
    expect(stored.state.token).toBe('jwt-token-123')
    expect(stored.state.user.email).toBe('test@test.com')
  })

  it('handles logout action', () => {
    const user = { id: 1, email: 'test@test.com', role: 'admin', schoolId: 1 }
    store.dispatch(login({ user: user as any, token: 'jwt-token-123', role: 'admin', schoolId: '1' }))
    store.dispatch(logout())

    const state = store.getState().auth
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.role).toBeNull()
    expect(state.schoolId).toBeNull()
  })

  it('clears localStorage on logout', () => {
    const user = { id: 1, email: 'test@test.com', role: 'admin', schoolId: 1 }
    store.dispatch(login({ user: user as any, token: 'jwt-token-123', role: 'admin', schoolId: '1' }))
    store.dispatch(logout())

    expect(localStorage.getItem('auth-store')).toBeNull()
  })

  it('handles setLoading', () => {
    store.dispatch(setLoading(true))
    expect(store.getState().auth.loading).toBe(true)

    store.dispatch(setLoading(false))
    expect(store.getState().auth.loading).toBe(false)
  })

  it('handles setError and clearError', () => {
    store.dispatch(setError('Something went wrong'))
    expect(store.getState().auth.error).toBe('Something went wrong')

    store.dispatch(clearError())
    expect(store.getState().auth.error).toBeNull()
  })
})
