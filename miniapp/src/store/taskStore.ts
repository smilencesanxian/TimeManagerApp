import { create } from 'zustand'
import { taskApi, Task } from '../services/api'

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  error: string | null

  fetchTodayTasks: (childId?: string) => Promise<void>
  fetchTasks: (filter: { childId?: string; date?: string; status?: string }) => Promise<void>
  createTask: (params: Parameters<typeof taskApi.create>[0]) => Promise<Task>
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  // WebSocket 实时更新
  applyStatusUpdate: (taskId: string, status: Task['status']) => void
  appendTask: (task: Task) => void
  removeTask: (taskId: string) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTodayTasks: async (childId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await taskApi.today(childId)
      set({ tasks, isLoading: false })
    } catch (e: unknown) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  fetchTasks: async (filter) => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await taskApi.list(filter)
      set({ tasks, isLoading: false })
    } catch (e: unknown) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  createTask: async (params) => {
    const task = await taskApi.create(params)
    set((s) => ({ tasks: [...s.tasks, task] }))
    return task
  },

  updateTaskStatus: async (id, status) => {
    const task = await taskApi.updateStatus(id, status)
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? task : t)),
    }))
  },

  deleteTask: async (id) => {
    await taskApi.delete(id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  // 以下由 WebSocket 事件触发
  applyStatusUpdate: (taskId, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : t.completedAt } : t
      ),
    }))
  },

  appendTask: (task) => {
    const today = new Date().toISOString().slice(0, 10)
    // 只添加今日任务（当前视图显示今日）
    if (task.date === today) {
      const exists = get().tasks.some((t) => t.id === task.id)
      if (!exists) {
        set((s) => ({ tasks: [...s.tasks, task] }))
      }
    }
  },

  removeTask: (taskId) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }))
  },
}))
