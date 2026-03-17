import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuthStore } from './store/authStore'
import './app.scss'

function App({ children }: { children: React.ReactNode }) {
  const { token, user, restore } = useAuthStore()

  useEffect(() => {
    restore()
  }, [restore])

  useEffect(() => {
    if (token && user) {
      // 仅在登录页才自动跳转，避免打断直接导航到其他页面（如 E2E 测试）
      const hash = (typeof window !== 'undefined' && window.location.hash) || ''
      if (hash && !hash.includes('login')) return
      const targetPage = user.role === 'parent'
        ? '/pages/parent/home/index'
        : '/pages/child/tasks/index'
      Taro.switchTab({ url: targetPage }).catch(() => {
        Taro.redirectTo({ url: targetPage })
      })
    }
  }, [token, user])

  return children
}

export default App
