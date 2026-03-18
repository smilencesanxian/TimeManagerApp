import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import styles from './index.module.scss'

const STORAGE_KEY = 'notification_settings'

interface NotificationSettings {
  taskReminder: boolean
  timeWarning: boolean
  dailySummary: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  taskReminder: true,
  timeWarning: true,
  dailySummary: false,
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [showSuccess, setShowSuccess] = useState(false)

  useDidShow(() => {
    try {
      const saved = Taro.getStorageSync(STORAGE_KEY) as string | undefined
      if (saved) setSettings(JSON.parse(saved) as NotificationSettings)
    } catch { /* ignore */ }
  })

  function toggle(key: keyof NotificationSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(settings))
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  return (
    <View className={styles.container} data-testid='notification-settings-page'>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>‹</Text>
        </View>
        <Text className={styles.headerTitle}>通知设置</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.card}>
          <View className={styles.row}>
            <Text className={styles.rowLabel}>任务完成提醒</Text>
            <input
              type='checkbox'
              checked={settings.taskReminder}
              onChange={() => toggle('taskReminder')}
              data-testid='switch-task-reminder'
              className={styles.checkboxInput}
            />
          </View>
          <View className={styles.row}>
            <Text className={styles.rowLabel}>时间预警</Text>
            <input
              type='checkbox'
              checked={settings.timeWarning}
              onChange={() => toggle('timeWarning')}
              className={styles.checkboxInput}
            />
          </View>
          <View className={[styles.row, styles.rowLast].join(' ')}>
            <Text className={styles.rowLabel}>每日总结推送</Text>
            <input
              type='checkbox'
              checked={settings.dailySummary}
              onChange={() => toggle('dailySummary')}
              className={styles.checkboxInput}
            />
          </View>
        </View>

        <View
          className={styles.saveBtn}
          onClick={handleSave}
          data-testid='btn-save-notification'
        >
          <Text className={styles.saveBtnText}>保存</Text>
        </View>

        {showSuccess && (
          <View className={styles.successToast} data-testid='success-toast'>
            <Text className={styles.successText}>✅ 保存成功</Text>
          </View>
        )}
      </View>
    </View>
  )
}
