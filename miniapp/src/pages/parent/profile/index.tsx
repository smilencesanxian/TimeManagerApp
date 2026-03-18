import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { authApi } from '../../../services/api'
import styles from './index.module.scss'

interface Child {
  id: string
  nickname: string
  avatarUrl: string | null
}

export default function ParentProfilePage() {
  const { user } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    loadData()
  })

  async function loadData() {
    setLoading(true)
    try {
      const me = await authApi.getMe()
      if (me.role !== 'parent') {
        Taro.redirectTo({ url: '/pages/child/tasks/index' })
        return
      }
      setNickname(me.nickname)
      const list = await authApi.getChildren()
      setChildren(list)
    } catch {
      // 401 redirect handled by request()
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className={styles.container} data-testid='profile-page'>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>我的</Text>
      </View>

      <ScrollView scrollY className={styles.content}>
        {/* 用户信息卡片 */}
        <View className={styles.userCard}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>👤</Text>
          </View>
          <View className={styles.userInfo}>
            <Text className={styles.nickname} data-testid='profile-nickname'>
              {nickname || (user?.nickname ?? '')}
            </Text>
            <Text className={styles.roleTag}>家长账号</Text>
          </View>
        </View>

        {/* 孩子信息 */}
        <View className={styles.section} data-testid='child-info-section'>
          <Text className={styles.sectionTitle}>绑定的孩子</Text>
          {loading ? (
            <Text className={styles.loadingText}>加载中...</Text>
          ) : children.length === 0 ? (
            <Text className={styles.emptyText}>暂未绑定孩子</Text>
          ) : (
            children.map((child) => (
              <View key={child.id} className={styles.childItem}>
                <Text className={styles.childAvatar}>👧</Text>
                <Text className={styles.childName}>{child.nickname}</Text>
              </View>
            ))
          )}
        </View>

        {/* 功能入口 */}
        <View className={styles.menuGroup}>
          <View
            className={styles.menuItem}
            onClick={() => Taro.navigateTo({ url: '/pages/parent/child-manage/index' })}
            data-testid='btn-child-manage'
          >
            <Text className={styles.menuIcon}>👶</Text>
            <Text className={styles.menuLabel}>孩子管理</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View
            className={styles.menuItem}
            onClick={() => Taro.navigateTo({ url: '/pages/parent/settings/index' })}
            data-testid='btn-goto-settings'
          >
            <Text className={styles.menuIcon}>⚙️</Text>
            <Text className={styles.menuLabel}>设置</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部导航 */}
      <View className={styles.bottomNav}>
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/home/index' })}
        >
          <Text className={styles.navIcon}>🏠</Text>
          <Text className={styles.navText}>首页</Text>
        </View>
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/plan/index' })}
        >
          <Text className={styles.navIcon}>📋</Text>
          <Text className={styles.navText}>计划</Text>
        </View>
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/ranking/index' })}
        >
          <Text className={styles.navIcon}>🏆</Text>
          <Text className={styles.navText}>评比</Text>
        </View>
        <View className={[styles.navItem, styles.navItemActive].join(' ')}>
          <Text className={styles.navIcon}>👤</Text>
          <Text className={styles.navText}>我的</Text>
        </View>
      </View>
    </View>
  )
}
