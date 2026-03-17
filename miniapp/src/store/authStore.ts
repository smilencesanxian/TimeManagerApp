import Taro from '@tarojs/taro'
import { create } from 'zustand'

interface UserInfo {
  id: string
  nickname: string
  role: 'parent' | 'child'
  avatarUrl: string | null
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: UserInfo | null
  isLoading: boolean

  setAuth: (token: string, refreshToken: string, user: UserInfo) => void
  clearAuth: () => void
  restore: () => void
}

const STORAGE_TOKEN_KEY = 'access_token'
const STORAGE_REFRESH_KEY = 'refresh_token'
const STORAGE_USER_KEY = 'user_info'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isLoading: false,

  setAuth: (token, refreshToken, user) => {
    Taro.setStorageSync(STORAGE_TOKEN_KEY, token)
    Taro.setStorageSync(STORAGE_REFRESH_KEY, refreshToken)
    Taro.setStorageSync(STORAGE_USER_KEY, JSON.stringify(user))
    set({ token, refreshToken, user })
  },

  clearAuth: () => {
    Taro.removeStorageSync(STORAGE_TOKEN_KEY)
    Taro.removeStorageSync(STORAGE_REFRESH_KEY)
    Taro.removeStorageSync(STORAGE_USER_KEY)
    set({ token: null, refreshToken: null, user: null })
  },

  restore: () => {
    try {
      const token = Taro.getStorageSync(STORAGE_TOKEN_KEY) as string | undefined
      const refreshToken = Taro.getStorageSync(STORAGE_REFRESH_KEY) as string | undefined
      const userStr = Taro.getStorageSync(STORAGE_USER_KEY) as string | undefined

      if (token && refreshToken && userStr) {
        const user = JSON.parse(userStr) as UserInfo
        set({ token, refreshToken, user })
      }
    } catch {
      // 存储读取失败时忽略
    }
  },
}))
