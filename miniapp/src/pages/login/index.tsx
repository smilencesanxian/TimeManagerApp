import { useState, useCallback } from 'react'
import { View, Text, Input, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../services/api'
import styles from './index.module.scss'

type TabMode = 'wechat' | 'phone'
type PhoneMode = 'login' | 'register'

export default function LoginPage() {
  const [tabMode, setTabMode] = useState<TabMode>('wechat')
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<'parent' | 'child'>('parent')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()

  const handleWechatLogin = useCallback(async () => {
    setLoading(true)
    try {
      const loginRes = await Taro.login()
      const result = await authApi.wechatLogin(loginRes.code, '微信用户')
      setAuth(result.accessToken, result.refreshToken, {
        id: result.user.id,
        nickname: result.user.nickname,
        role: result.user.role as 'parent' | 'child',
        avatarUrl: result.user.avatarUrl,
      })
      navigateByRole(result.user.role)
    } catch (err) {
      Taro.showToast({ title: String(err instanceof Error ? err.message : '登录失败'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [setAuth])

  const handlePhoneAuth = useCallback(async () => {
    if (!phone || !password) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      let result
      if (phoneMode === 'register') {
        if (!nickname) {
          Taro.showToast({ title: '请填写昵称', icon: 'none' })
          return
        }
        result = await authApi.register(phone, password, nickname, role)
      } else {
        result = await authApi.login(phone, password)
      }

      setAuth(result.accessToken, result.refreshToken, {
        id: result.user.id,
        nickname: result.user.nickname,
        role: result.user.role as 'parent' | 'child',
        avatarUrl: result.user.avatarUrl,
      })
      navigateByRole(result.user.role)
    } catch (err) {
      Taro.showToast({ title: String(err instanceof Error ? err.message : '操作失败'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [phone, password, nickname, role, phoneMode, setAuth])

  const navigateByRole = (userRole: string) => {
    const targetPage = userRole === 'parent'
      ? '/pages/parent/home/index'
      : '/pages/child/tasks/index'
    Taro.redirectTo({ url: targetPage })
  }

  return (
    <View className={styles.container}>
      {/* Logo区域 */}
      <View className={styles.logoArea}>
        <View className={styles.logoIcon}>⏰</View>
        <Text className={styles.appName}>AI时间管理</Text>
        <Text className={styles.appDesc}>家长轻松规划 · 孩子自主执行</Text>
      </View>

      {/* 登录Tab */}
      <View className={styles.tabBar}>
        <View
          className={`${styles.tab} ${tabMode === 'wechat' ? styles.tabActive : ''}`}
          onClick={() => setTabMode('wechat')}
        >
          微信登录
        </View>
        <View
          className={`${styles.tab} ${tabMode === 'phone' ? styles.tabActive : ''}`}
          onClick={() => setTabMode('phone')}
          data-testid='tab-phone'
        >
          手机号
        </View>
      </View>

      {/* 微信登录 */}
      {tabMode === 'wechat' && (
        <View className={styles.formArea}>
          <Button
            className={styles.wechatBtn}
            loading={loading}
            onClick={handleWechatLogin}
          >
            <Text className={styles.wechatBtnText}>微信一键登录</Text>
          </Button>
        </View>
      )}

      {/* 手机号登录/注册 */}
      {tabMode === 'phone' && (
        <View className={styles.formArea}>
          <View className={styles.subTabs}>
            <Text
              className={`${styles.subTab} ${phoneMode === 'login' ? styles.subTabActive : ''}`}
              onClick={() => setPhoneMode('login')}
              data-testid='tab-login-mode'
            >
              登录
            </Text>
            <Text
              className={`${styles.subTab} ${phoneMode === 'register' ? styles.subTabActive : ''}`}
              onClick={() => setPhoneMode('register')}
              data-testid='tab-register-mode'
            >
              注册
            </Text>
          </View>

          {phoneMode === 'register' && (
            <Input
              className={styles.input}
              placeholder='请输入昵称'
              value={nickname}
              onInput={e => setNickname(e.detail.value)}
              data-testid='input-nickname'
            />
          )}

          <Input
            className={styles.input}
            type='number'
            placeholder='请输入手机号'
            value={phone}
            onInput={e => setPhone(e.detail.value)}
            data-testid='input-phone'
          />

          <Input
            className={styles.input}
            password
            placeholder='请输入密码（6位以上）'
            value={password}
            onInput={e => setPassword(e.detail.value)}
            data-testid='input-password'
          />

          {phoneMode === 'register' && (
            <View className={styles.roleSelect}>
              <Text className={styles.roleLabel}>我是：</Text>
              <View className={styles.roleOptions}>
                <View
                  className={`${styles.roleOption} ${role === 'parent' ? styles.roleOptionActive : ''}`}
                  onClick={() => setRole('parent')}
                  data-testid='role-parent'
                >
                  👨‍👩‍👧 家长
                </View>
                <View
                  className={`${styles.roleOption} ${role === 'child' ? styles.roleOptionActive : ''}`}
                  onClick={() => setRole('child')}
                  data-testid='role-child'
                >
                  🧒 孩子
                </View>
              </View>
            </View>
          )}

          <Button
            className={styles.submitBtn}
            loading={loading}
            onClick={handlePhoneAuth}
            data-testid='btn-login'
          >
            {phoneMode === 'login' ? '登录' : '注册'}
          </Button>
        </View>
      )}

      <Text className={styles.agreement}>登录即代表同意《用户协议》和《隐私政策》</Text>
    </View>
  )
}
