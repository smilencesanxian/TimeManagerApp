import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { authApi } from '../../../services/api'
import styles from './index.module.scss'

export default function SettingsPage() {
  const { refreshToken, clearAuth } = useAuthStore()
  const [showAbout, setShowAbout] = useState(false)

  useDidShow(() => {
    // Role guard: only parents can access settings
    authApi.getMe().then((me) => {
      if (me.role !== 'parent') {
        Taro.redirectTo({ url: '/pages/child/tasks/index' })
      }
    }).catch(() => {
      // 401 handled by request() → redirect to login
    })
  })

  async function handleLogout() {
    try {
      const rt = refreshToken || (Taro.getStorageSync('refresh_token') as string | undefined)
      if (rt) {
        await authApi.logout(rt)
      }
    } catch { /* ignore */ } finally {
      clearAuth()
      Taro.redirectTo({ url: '/pages/login/index' })
    }
  }

  return (
    <View className={styles.container} data-testid='settings-page'>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>‹</Text>
        </View>
        <Text className={styles.headerTitle}>设置</Text>
      </View>

      <View className={styles.content}>
        {/* 账号与安全 */}
        <View className={styles.group}>
          <Text className={styles.groupTitle}>账号</Text>
          <View
            className={styles.item}
            data-testid='settings-account'
            onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}
          >
            <Text className={styles.itemIcon}>🔒</Text>
            <View className={styles.itemInfo}>
              <Text className={styles.itemName}>账号与安全</Text>
            </View>
            <Text className={styles.itemArrow}>›</Text>
          </View>
        </View>

        {/* 功能设置 */}
        <View className={styles.group}>
          <Text className={styles.groupTitle}>功能</Text>
          <View
            className={styles.item}
            data-testid='settings-schedule'
            onClick={() => Taro.navigateTo({ url: '/pages/parent/settings/schedule/index' })}
          >
            <Text className={styles.itemIcon}>🌙</Text>
            <View className={styles.itemInfo}>
              <Text className={styles.itemName}>作息设置</Text>
              <Text className={styles.itemDesc}>设置孩子睡觉时间</Text>
            </View>
            <Text className={styles.itemArrow}>›</Text>
          </View>
          <View
            className={styles.item}
            data-testid='settings-notification'
            onClick={() => Taro.navigateTo({ url: '/pages/parent/settings/notification/index' })}
          >
            <Text className={styles.itemIcon}>🔔</Text>
            <View className={styles.itemInfo}>
              <Text className={styles.itemName}>通知设置</Text>
            </View>
            <Text className={styles.itemArrow}>›</Text>
          </View>
        </View>

        {/* 关于 */}
        <View className={styles.group}>
          <Text className={styles.groupTitle}>其他</Text>
          <View
            className={styles.item}
            data-testid='settings-about'
            onClick={() => setShowAbout(!showAbout)}
          >
            <Text className={styles.itemIcon}>ℹ️</Text>
            <View className={styles.itemInfo}>
              <Text className={styles.itemName}>关于</Text>
            </View>
            <Text className={styles.itemArrow}>›</Text>
          </View>
          {showAbout && (
            <View className={styles.aboutPanel}>
              <Text className={styles.appName}>AI时间管理</Text>
              <Text className={styles.appVersion} data-testid='app-version'>v1.0.0</Text>
            </View>
          )}
        </View>

        {/* 退出登录 */}
        <View className={styles.logoutBtn} onClick={handleLogout} data-testid='btn-logout'>
          <Text className={styles.logoutText}>退出登录</Text>
        </View>
      </View>
    </View>
  )
}
