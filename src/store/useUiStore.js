import { create } from 'zustand'

const useUiStore = create((set) => ({
  navOpen: false,
  activeRole: 'school-admin',
  toggleNav: () => set((state) => ({ navOpen: !state.navOpen })),
  closeNav: () => set({ navOpen: false }),
  setActiveRole: (role) => set({ activeRole: role }),
}))

export default useUiStore
