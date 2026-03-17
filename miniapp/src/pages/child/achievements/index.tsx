import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { achievementApi, AchievementSummary, WeeklyStats, HistoryRecord } from '../../../services/api'
import styles from './index.module.scss'

const LEVEL_THRESHOLDS = [0, 10, 25, 45, 70]
const LEVEL_MAX = 70

function getProgressPercent(summary: AchievementSummary): number {
  const raw = summary.stars + summary.moons * 10 + summary.suns * 100
  const currentThreshold = LEVEL_THRESHOLDS[summary.level - 1] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[summary.level] ?? LEVEL_MAX
  if (summary.level >= 5) return 100
  return Math.round(((raw - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
}

export default function ChildAchievementsPage() {
  const user = useAuthStore((s) => s.user)
  const [summary, setSummary] = useState<AchievementSummary | null>(null)
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const [s, w, h] = await Promise.all([
        achievementApi.getSummary(),
        achievementApi.getWeekly(),
        achievementApi.getHistory(),
      ])
      setSummary(s)
      setWeekly(w)
      setHistory(h)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { load() })

  if (loading && !summary) {
    return (
      <View className={styles.container}>
        <Text className={styles.loadingText}>加载中...</Text>
      </View>
    )
  }

  if (error && !summary) {
    return (
      <View className={styles.container}>
        <View data-testid="achievement-error-state" className={styles.errorState}>
          <Text className={styles.errorText}>加载失败，请重试</Text>
        </View>
      </View>
    )
  }

  const progressPercent = summary ? getProgressPercent(summary) : 0

  return (
    <View className={styles.container}>
      {/* Level section */}
      <View className={styles.levelSection}>
        <Text data-testid="level-display" className={styles.levelDisplay}>
          Lv.{summary?.level ?? 1}
        </Text>
        <Text data-testid="level-title" className={styles.levelTitle}>
          {summary?.levelTitle ?? '时间小新手'}
        </Text>
        <View data-testid="level-progress-bar" className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </View>
        <Text data-testid="stars-to-next-level" className={styles.starsToNext}>
          {summary?.level && summary.level >= 5
            ? '已达最高等级'
            : `距下一级还需 ${summary?.starsToNextLevel ?? 0} ⭐`}
        </Text>
      </View>

      {/* Rewards totals */}
      <View className={styles.rewardsRow}>
        <View className={styles.rewardItem}>
          <Text className={styles.rewardEmoji}>⭐</Text>
          <Text data-testid="achievement-stars-total" className={styles.rewardCount}>
            {summary?.stars ?? 0}
          </Text>
          <Text className={styles.rewardLabel}>星星</Text>
        </View>
        <View className={styles.rewardItem}>
          <Text className={styles.rewardEmoji}>🌙</Text>
          <Text data-testid="achievement-moons-total" className={styles.rewardCount}>
            {summary?.moons ?? 0}
          </Text>
          <Text className={styles.rewardLabel}>月亮</Text>
        </View>
        <View className={styles.rewardItem}>
          <Text className={styles.rewardEmoji}>☀️</Text>
          <Text data-testid="achievement-suns-total" className={styles.rewardCount}>
            {summary?.suns ?? 0}
          </Text>
          <Text className={styles.rewardLabel}>太阳</Text>
        </View>
      </View>

      {/* Weekly summary */}
      <View data-testid="weekly-summary" className={styles.weeklySummary}>
        <Text className={styles.weeklyTitle}>本周获得</Text>
        <View className={styles.weeklyRow}>
          <Text className={styles.weeklyLabel}>⭐ 星星</Text>
          <Text data-testid="weekly-stars-earned" className={styles.weeklyValue}>
            {weekly?.starsThisWeek ?? 0}
          </Text>
        </View>
        <View className={styles.weeklyRow}>
          <Text className={styles.weeklyLabel}>🌙 月亮</Text>
          <Text data-testid="weekly-moons-earned" className={styles.weeklyValue}>
            {weekly?.moonsThisWeek ?? 0}
          </Text>
        </View>
      </View>

      {/* History button */}
      <Text
        data-testid="btn-view-history"
        className={styles.historyBtn}
        onClick={() => {
          setShowCalendar(true)
          Taro.navigateTo({ url: '/pages/child/achievement/detail/index' })
        }}
      >
        查看历史记录
      </Text>

      {/* Inline calendar (shown when btn clicked before navigation) */}
      {showCalendar && (
        <AchievementCalendar records={history} />
      )}
    </View>
  )
}

interface AchievementCalendarProps {
  records: HistoryRecord[]
}

function AchievementCalendar({ records }: AchievementCalendarProps) {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const recordMap = new Map(records.map((r) => [r.date, r.stars]))
  const days: Array<{ date: string | null; stars: number }> = []

  // Padding
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, stars: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, stars: recordMap.get(dateStr) ?? 0 })
  }

  return (
    <View data-testid="achievement-history-calendar" className={styles.calendar}>
      <View className={styles.calendarHeader}>
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <Text key={d} className={styles.calendarHeaderCell}>{d}</Text>
        ))}
      </View>
      <View className={styles.calendarGrid}>
        {days.map((day, idx) => (
          <View
            key={idx}
            data-testid={day.date === today ? 'calendar-day-today' : undefined}
            className={[
              styles.calendarCell,
              day.date === today ? styles.calendarToday : '',
              !day.date ? styles.calendarEmpty : '',
            ].join(' ')}
          >
            {day.date && (
              <>
                <Text className={styles.calendarDayNum}>
                  {parseInt(day.date.slice(8))}
                </Text>
                {day.stars > 0 && (
                  <Text className={styles.calendarStars}>{day.stars}</Text>
                )}
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}
