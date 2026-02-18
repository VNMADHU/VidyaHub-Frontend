import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { UiState } from '@/types'

const initialState: UiState = {
  navOpen: false,
  activeRole: 'school-admin',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleNav(state) {
      state.navOpen = !state.navOpen
    },
    closeNav(state) {
      state.navOpen = false
    },
    setActiveRole(state, action: PayloadAction<string>) {
      state.activeRole = action.payload
    },
  },
})

export const { toggleNav, closeNav, setActiveRole } = uiSlice.actions
export default uiSlice.reducer
