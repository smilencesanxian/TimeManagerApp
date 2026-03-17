import { create } from 'zustand'
import { habitApi, Habit } from '../services/api'

interface HabitStore {
  habits: Habit[]
  loading: boolean
  error: string | null
  fetchHabits: (childId?: string) => Promise<void>
  checkIn: (habitId: string) => Promise<number>
  cancelCheckIn: (habitId: string) => Promise<number>
  addHabit: (habit: Habit) => void
  removeHabit: (habitId: string) => void
  updateHabitInStore: (habit: Habit) => void
}

export const useHabitStore = create<HabitStore>((set, _get) => ({
  habits: [],
  loading: false,
  error: null,

  fetchHabits: async (childId?: string) => {
    set({ loading: true, error: null })
    try {
      const habits = await habitApi.list(childId)
      set({ habits, loading: false })
    } catch (err: unknown) {
      const error = err as Error
      set({ error: error.message, loading: false })
    }
  },

  checkIn: async (habitId: string) => {
    const result = await habitApi.checkIn(habitId)
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === habitId ? { ...h, checkedIn: true, streak: result.streak } : h
      ),
    }))
    return result.rewardStars
  },

  cancelCheckIn: async (habitId: string) => {
    const result = await habitApi.cancelCheckIn(habitId)
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === habitId ? { ...h, checkedIn: false } : h
      ),
    }))
    return result.rewardStars
  },

  addHabit: (habit: Habit) => set((state) => ({ habits: [...state.habits, habit] })),
  removeHabit: (habitId: string) => set((state) => ({
    habits: state.habits.filter((h) => h.id !== habitId),
  })),
  updateHabitInStore: (habit: Habit) => set((state) => ({
    habits: state.habits.map((h) => h.id === habit.id ? habit : h),
  })),
}))
