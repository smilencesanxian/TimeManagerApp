import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import styles from './index.module.scss'

const STORAGE_KEY = 'schedule_sleep_time'

function isValidSleepTime(time: string): boolean {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return false
  const h = parseInt(match[1])
  const m = parseInt(match[2])
  if (m < 0 || m > 59) return false
  // valid range 19:00 - 23:00 (inclusive)
  if (h < 19 || h > 23) return false
  if (h === 23 && m > 0) return false
  return true
}

export default function ScheduleSettingsPage() {
  const [sleepTime, setSleepTime] = useState('21:30')
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useDidShow(() => {
    const saved = Taro.getStorageSync(STORAGE_KEY) as string | undefined
    if (saved) setSleepTime(saved)
  })

  function handleSave() {
    if (!isValidSleepTime(sleepTime)) {
      setError('睡觉时间需在 19:00 ~ 23:00 之间')
      return
    }
    setError('')
    Taro.setStorageSync(STORAGE_KEY, sleepTime)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  return (
    <View className={styles.container} data-testid='schedule-settings-page'>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backText}>‹</Text>
        </View>
        <Text className={styles.headerTitle}>作息设置</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.card}>
          <Text className={styles.label}>睡觉时间</Text>
          <input
            className={styles.input}
            value={sleepTime}
            onChange={(e) => {
              setSleepTime(e.target.value)
              setError('')
            }}
            placeholder='19:00 ~ 23:00'
            data-testid='sleep-time-picker'
          />
          {error ? (
            <Text className={styles.errorText} data-testid='sleep-time-error'>{error}</Text>
          ) : null}
        </View>

        <View
          className={styles.saveBtn}
          onClick={handleSave}
          data-testid='btn-save-schedule'
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
