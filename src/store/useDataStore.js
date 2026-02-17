import { create } from 'zustand'

const useDataStore = create((set) => ({
  students: [],
  teachers: [],
  schools: [],
  events: [],
  announcements: [],
  loading: false,
  error: null,

  setStudents: (students) => set({ students }),
  setTeachers: (teachers) => set({ teachers }),
  setSchools: (schools) => set({ schools }),
  setEvents: (events) => set({ events }),
  setAnnouncements: (announcements) => set({ announcements }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))

export default useDataStore
