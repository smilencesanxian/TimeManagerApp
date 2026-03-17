import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { useHabitStore } from '../../../../store/habitStore'
import { habitApi } from '../../../../services/api'
import styles from '../create/index.module.scss'

const ICONS = ['📚', '🏃', '✏️', '🎵', '🌙', '💪', '🧘', '🎨', '🔢', '📝']
const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]

export default function HabitEditPage() {
  const { updateHabitInStore } = useHabitStore()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📚')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [rewardStars, setRewardStars] = useState(1)
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [habitId, setHabitId] = useState('')

  useDidShow(() => {
    const params = (Taro.getCurrentInstance?.()?.router?.params ?? {}) as Record<string, string>
    const id = params['id'] ?? ''
    setHabitId(id)
    if (id) {
      habitApi.getById(id).then((habit) => {
        setName(habit.name)
        setIcon(habit.icon)
        setFrequency(habit.frequency)
        setWeekdays(habit.weekdays ? (JSON.parse(habit.weekdays) as number[]) : [])
        setRewardStars(habit.rewardStars)
      }).catch(() => Taro.navigateBack())
    }
  })

  const toggleWeekday = useCallback((day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    setSaving(true)
    try {
      const habit = await habitApi.update(habitId, {
        name: name.trim(),
        icon,
        frequency,
        weekdays: frequency === 'weekly' ? weekdays : undefined,
        rewardStars,
      })
      Taro.redirectTo({ url: '/pages/parent/plan/index?tab=habits' })
    } catch (err: unknown) {
      const error = err as Error
      Taro.showToast({ title: error.message || '更新失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }, [name, icon, frequency, weekdays, rewardStars, habitId, updateHabitInStore])

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          <Text>←</Text>
        </View>
        <Text className={styles.headerTitle}>编辑习惯</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>习惯名称</Text>
          <Input
            className={styles.formInput}
            data-testid="input-habit-name"
            value={name}
            onInput={(e) => { setName(e.detail.value); setNameError(false) }}
            placeholder="例如：每天阅读30分钟"
          />
          {nameError && (
            <Text className={styles.errorText} data-testid="habit-name-error">
              请填写习惯名称
            </Text>
          )}
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>选择图标</Text>
          <View className={styles.iconGrid}>
            {ICONS.map((ic) => (
              <View
                key={ic}
                className={[styles.iconOption, icon === ic ? styles.iconSelected : ''].join(' ')}
                data-testid={`habit-icon-${ic}`}
                onClick={() => setIcon(ic)}
              >
                <Text>{ic}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>打卡频率</Text>
          <View className={styles.frequencyRow}>
            <View
              className={[styles.freqOption, frequency === 'daily' ? styles.freqSelected : ''].join(' ')}
              data-testid="frequency-daily"
              onClick={() => setFrequency('daily')}
            >
              <Text>每天</Text>
            </View>
            <View
              className={[styles.freqOption, frequency === 'weekly' ? styles.freqSelected : ''].join(' ')}
              data-testid="frequency-weekly"
              onClick={() => setFrequency('weekly')}
            >
              <Text>每周</Text>
            </View>
          </View>

          {frequency === 'weekly' && (
            <View className={styles.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <View
                  key={d.value}
                  className={[styles.weekdayBtn, weekdays.includes(d.value) ? styles.weekdaySelected : ''].join(' ')}
                  data-testid={`weekday-${d.value}`}
                  onClick={() => toggleWeekday(d.value)}
                >
                  <Text>{d.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>奖励星星 ⭐ ×{rewardStars}</Text>
          <View className={styles.starsRow}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                className={[styles.starOption, rewardStars === n ? styles.starSelected : ''].join(' ')}
                onClick={() => setRewardStars(n)}
              >
                <Text>{'⭐'.repeat(n)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.footer}>
        <View
          className={[styles.saveBtn, saving ? styles.saveBtnDisabled : ''].join(' ')}
          data-testid="btn-save-habit"
          onClick={saving ? undefined : handleSave}
        >
          <Text className={styles.saveBtnText}>{saving ? '保存中...' : '保存习惯'}</Text>
        </View>
      </View>
    </View>
  )
}
