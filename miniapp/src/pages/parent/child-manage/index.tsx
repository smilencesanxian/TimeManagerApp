import { View, Text, Input } from '@tarojs/components'
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

export default function ChildManagePage() {
  const { user } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteNickname, setInviteNickname] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useDidShow(() => {
    loadChildren()
  })

  async function loadChildren() {
    setLoading(true)
    try {
      const list = await authApi.getChildren()
      setChildren(list)
    } catch {
      setChildren([])
    } finally {
      setLoading(false)
    }
  }

  async function handleGenInvite() {
    const nickname = inviteNickname.trim() || '新孩子'
    setGenerating(true)
    try {
      const res = await authApi.generateInvite(nickname)
      setInviteCode(res.inviteCode)
      setInviteNickname('')
    } catch {
      Taro.showToast({ title: '生成失败，请重试', icon: 'none' })
    } finally {
      setGenerating(false)
    }
  }

  if (!user) return null

  return (
    <View className={styles.container} data-testid='child-manage-page'>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>‹</Text>
        </View>
        <Text className={styles.headerTitle}>孩子管理</Text>
      </View>

      <View className={styles.content}>
        {/* 已绑定孩子列表 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>已绑定的孩子</Text>
          {loading ? (
            <Text className={styles.loadingText}>加载中...</Text>
          ) : children.length === 0 ? (
            <Text className={styles.emptyText}>暂未绑定孩子</Text>
          ) : (
            children.map((child, i) => (
              <View key={child.id} className={styles.childItem} data-testid={`child-item-${i}`}>
                <Text className={styles.childAvatar}>👧</Text>
                <Text className={styles.childName}>{child.nickname}</Text>
              </View>
            ))
          )}
        </View>

        {/* 邀请码生成 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>邀请新孩子</Text>

          {inviteCode ? (
            <View className={styles.codeBox}>
              <Text className={styles.codeLabel}>邀请码（发给孩子输入）</Text>
              <Text className={styles.codeText} data-testid='invite-code'>{inviteCode}</Text>
              <Text className={styles.codeNote}>邀请码为一次性，绑定后自动失效</Text>
              <View
                className={styles.btnSecondary}
                onClick={() => { setInviteCode(null) }}
              >
                <Text className={styles.btnSecondaryText}>生成新邀请码</Text>
              </View>
            </View>
          ) : (
            <View>
              <Input
                className={styles.input}
                placeholder='输入孩子昵称（可选）'
                value={inviteNickname}
                onInput={(e) => setInviteNickname(e.detail.value)}
                data-testid='input-child-nickname'
              />
              <View
                className={[styles.btn, generating ? styles.btnDisabled : ''].join(' ')}
                onClick={generating ? undefined : handleGenInvite}
                data-testid='btn-gen-invite-code'
              >
                <Text className={styles.btnText}>{generating ? '生成中...' : '生成邀请码'}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
