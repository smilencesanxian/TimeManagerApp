import Taro from '@tarojs/taro'

// API基础URL (由构建配置注入)
declare const API_BASE_URL: string
const BASE_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000/api/v1'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: Record<string, unknown>,
  withAuth = true,
  timeout?: number
): Promise<T> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (withAuth) {
    const token = Taro.getStorageSync('access_token') as string | undefined
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await Taro.request<ApiResponse<T>>({
    url: `${BASE_URL}${path}`,
    method,
    data,
    header,
    ...(timeout !== undefined ? { timeout } : {}),
  })

  if (res.statusCode === 401) {
    // Token过期，尝试刷新
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // 重试请求
      const newToken = Taro.getStorageSync('access_token') as string
      header['Authorization'] = `Bearer ${newToken}`
      const retryRes = await Taro.request<ApiResponse<T>>({
        url: `${BASE_URL}${path}`,
        method,
        data,
        header,
        ...(timeout !== undefined ? { timeout } : {}),
      })
      if (retryRes.statusCode >= 400) {
        throw new Error(retryRes.data.message)
      }
      return retryRes.data.data
    } else {
      // 刷新失败，跳转登录
      Taro.removeStorageSync('access_token')
      Taro.removeStorageSync('refresh_token')
      Taro.removeStorageSync('user_info')
      Taro.redirectTo({ url: '/pages/login/index' })
      throw new Error('请重新登录')
    }
  }

  if (res.statusCode >= 400) {
    throw new Error(res.data.message || '请求失败')
  }

  return res.data.data
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = Taro.getStorageSync('refresh_token') as string | undefined
    if (!refreshToken) return false

    const res = await Taro.request<ApiResponse<{ accessToken: string; refreshToken: string }>>({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
    })

    if (res.statusCode === 200 && res.data.data) {
      Taro.setStorageSync('access_token', res.data.data.accessToken)
      Taro.setStorageSync('refresh_token', res.data.data.refreshToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

// 认证相关API
export interface LoginResult {
  user: { id: string; nickname: string; role: string; avatarUrl: string | null }
  accessToken: string
  refreshToken: string
  isNewUser?: boolean
}

export const authApi = {
  wechatLogin: (code: string, nickname?: string, avatarUrl?: string) =>
    request<LoginResult>('POST', '/auth/wechat-login', { code, nickname, avatarUrl }, false),

  register: (phone: string, password: string, nickname: string, role: 'parent' | 'child') =>
    request<LoginResult>('POST', '/auth/register', { phone, password, nickname, role }, false),

  login: (phone: string, password: string) =>
    request<LoginResult>('POST', '/auth/login', { phone, password }, false),

  logout: (refreshToken: string) =>
    request<void>('POST', '/auth/logout', { refreshToken }),

  setRole: (role: 'parent' | 'child') =>
    request<{ id: string; nickname: string; role: string }>('PUT', '/auth/role', { role }),

  generateInvite: (childNickname: string) =>
    request<{ inviteCode: string; childId: string }>('POST', '/auth/invite', { childNickname }),

  bindInvite: (inviteCode: string) =>
    request<{ parentId: string; childId: string }>('POST', '/auth/bind', { inviteCode }),

  getMe: () =>
    request<{ id: string; nickname: string; role: string; avatarUrl: string | null; familyId: string | null }>('GET', '/auth/me'),

  getChildren: () =>
    request<Array<{ id: string; nickname: string; avatarUrl: string | null }>>('GET', '/auth/children'),
}

// 任务相关 API
export interface Task {
  id: string
  childId: string
  createdById: string
  date: string
  subject: string
  title: string
  description: string | null
  duration: number
  status: 'todo' | 'doing' | 'done' | 'paused'
  priority: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskParams {
  childId: string
  date: string
  subject: string
  title: string
  description?: string
  duration: number
  priority?: number
}

export const taskApi = {
  create: (params: CreateTaskParams) =>
    request<Task>('POST', '/tasks', params as unknown as Record<string, unknown>),

  list: (filter: { childId?: string; date?: string; status?: string }) =>
    request<Task[]>('GET', `/tasks?${new URLSearchParams(
      Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined)) as Record<string, string>
    ).toString()}`),

  today: (childId?: string) =>
    request<Task[]>('GET', `/tasks/today${childId ? `?childId=${childId}` : ''}`),

  getById: (id: string) =>
    request<Task>('GET', `/tasks/${id}`),

  update: (id: string, params: Partial<CreateTaskParams>) =>
    request<Task>('PUT', `/tasks/${id}`, params as unknown as Record<string, unknown>),

  updateStatus: (id: string, status: Task['status']) =>
    request<Task>('PUT', `/tasks/${id}/status`, { status }),

  delete: (id: string) =>
    request<void>('DELETE', `/tasks/${id}`),
}

// 番茄钟相关 API
export interface PomodoroSession {
  id: string
  taskId: string
  userId: string
  type: 'focus' | 'break'
  durationMin: number
  startedAt: string
  endedAt: string | null
  completed: boolean
  createdAt: string
}

export interface PomodoroSummary {
  taskId: string
  totalFocusMin: number
  totalBreakMin: number
  completedPomodoros: number
  sessions: PomodoroSession[]
}

export const pomodoroApi = {
  startSession: (taskId: string, type: 'focus' | 'break', durationMin?: number) =>
    request<PomodoroSession>('POST', `/tasks/${taskId}/pomodoro/start`, {
      type,
      ...(durationMin !== undefined ? { durationMin } : {}),
    }),

  endSession: (sessionId: string, completed: boolean) =>
    request<PomodoroSession>('POST', `/pomodoro/sessions/${sessionId}/end`, { completed }),

  getSessions: (taskId: string, type?: 'focus' | 'break') =>
    request<PomodoroSession[]>('GET', `/tasks/${taskId}/pomodoro/sessions${type ? `?type=${type}` : ''}`),

  getSummary: (taskId: string) =>
    request<PomodoroSummary>('GET', `/tasks/${taskId}/pomodoro/summary`),
}

// 习惯打卡相关 API
export interface Habit {
  id: string
  childId: string
  createdById: string
  name: string
  icon: string
  frequency: 'daily' | 'weekly'
  weekdays: string | null
  rewardStars: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  checkedIn: boolean
  streak: number
}

export interface CreateHabitParams {
  childId: string
  name: string
  icon?: string
  frequency?: 'daily' | 'weekly'
  weekdays?: number[]
  rewardStars?: number
}

export const habitApi = {
  create: (params: CreateHabitParams) =>
    request<Habit>('POST', '/habits', params as unknown as Record<string, unknown>),

  list: (childId?: string) =>
    request<Habit[]>('GET', `/habits${childId ? `?childId=${childId}` : ''}`),

  getById: (id: string) =>
    request<Habit>('GET', `/habits/${id}`),

  update: (id: string, params: Partial<Omit<CreateHabitParams, 'childId'>>) =>
    request<Habit>('PUT', `/habits/${id}`, params as unknown as Record<string, unknown>),

  delete: (id: string) =>
    request<void>('DELETE', `/habits/${id}`),

  checkIn: (id: string) =>
    request<{ checkedIn: boolean; rewardStars: number; streak: number }>('POST', `/habits/${id}/checkin`),

  cancelCheckIn: (id: string) =>
    request<{ checkedIn: boolean; rewardStars: number }>('DELETE', `/habits/${id}/checkin`),

  getTodayCheckin: (id: string) =>
    request<{ checkedIn: boolean }>('GET', `/habits/${id}/checkin/today`),
}

// ─── Achievement API ───────────────────────────────────────────────────────────

export interface AchievementSummary {
  stars: number
  moons: number
  suns: number
  level: number
  levelTitle: string
  starsToNextLevel: number
}

export interface HistoryRecord {
  date: string
  stars: number
}

export interface WeeklyStats {
  starsThisWeek: number
  moonsThisWeek: number
}

export const achievementApi = {
  getSummary: (childId?: string) =>
    request<AchievementSummary>('GET', childId ? `/achievements/summary?childId=${childId}` : '/achievements/summary'),

  getHistory: (year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : ''
    return request<HistoryRecord[]>('GET', `/achievements/history${params}`)
  },

  getWeekly: () =>
    request<WeeklyStats>('GET', '/achievements/weekly'),
}


export interface ParsedTask {
  subject: string
  title: string
  duration: number
  priority: number
}

export const aiApi = {
  parseTask: (description: string) =>
    request<ParsedTask>('POST', '/ai/parse-task', { description }, true, 6000),

  suggestComments: (childName: string, taskInfo?: string) =>
    request<string[]>('POST', '/ai/suggest-comments', { childName, taskInfo }, true, 8000),
}

// 心语评语 API
export interface ParentComment {
  id: string
  parentId: string
  childId: string
  content: string
  createdAt: string
}

export const commentApi = {
  send: (childId: string, content: string) =>
    request<ParentComment>('POST', '/comments', { childId, content }),

  list: (childId?: string) =>
    request<ParentComment[]>('GET', `/comments${childId ? `?childId=${childId}` : ''}`),

  delete: (id: string) =>
    request<void>('DELETE', `/comments/${id}`),
}
