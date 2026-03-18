import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { authApi, achievementApi, habitApi, statsApi, WeeklyStatsData, Habit } from '../../../services/api'
import styles from './index.module.scss'

interface Child {
  id: string
  nickname: string
  avatarUrl: string | null
}

// Get Monday of the week containing `date`
function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekTitle(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const m1 = monday.getMonth() + 1
  const d1 = monday.getDate()
  const m2 = sunday.getMonth() + 1
  const d2 = sunday.getDate()
  return `${m1}.${d1} - ${m2}.${d2}`
}

// Get all 7 days of the week (Mon-Sun) as YYYY-MM-DD strings
function getWeekDays(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return formatDate(d)
  })
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function ParentRankingPage() {
  const { user } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [weekMonday, setWeekMonday] = useState<Date>(() => getWeekMonday(new Date()))
  const [stats, setStats] = useState<WeeklyStatsData | null>(null)
  const [weeklyAch, setWeeklyAch] = useState<{ starsThisWeek: number; moonsThisWeek: number } | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitCheckins, setHabitCheckins] = useState<Record<string, string[]>>({}) // habitId -> [date]
  const [loading, setLoading] = useState(true)

  const isCurrentWeek = formatDate(weekMonday) === formatDate(getWeekMonday(new Date()))

  useDidShow(() => {
    loadInitial()
  })

  async function loadInitial() {
    try {
      const list = await authApi.getChildren()
      setChildren(list)
      const child = list[0] ?? null
      setSelectedChild(child)
      if (child) await loadWeekData(weekMonday, child.id)
    } catch {
      setLoading(false)
    }
  }

  const loadWeekData = useCallback(async (monday: Date, childId: string) => {
    setLoading(true)
    const startDate = formatDate(monday)
    try {
      const [statsData, achData, habitList] = await Promise.allSettled([
        statsApi.getWeekly(startDate, childId),
        achievementApi.getWeekly(),
        habitApi.list(childId),
      ])

      setStats(statsData.status === 'fulfilled' ? statsData.value : null)
      setWeeklyAch(achData.status === 'fulfilled' ? achData.value : null)

      if (habitList.status === 'fulfilled') {
        setHabits(habitList.value)
        // For simplicity, mark today's checked-in habits for current week
        const checkins: Record<string, string[]> = {}
        habitList.value.forEach((h) => {
          checkins[h.id] = h.checkedIn ? [formatDate(new Date())] : []
        })
        setHabitCheckins(checkins)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  async function shiftWeek(delta: number) {
    const newMonday = new Date(weekMonday)
    newMonday.setDate(weekMonday.getDate() + delta * 7)
    setWeekMonday(newMonday)
    if (selectedChild) await loadWeekData(newMonday, selectedChild.id)
  }

  const weekDays = getWeekDays(weekMonday)
  const taskRate = stats ? stats.taskCompletionRate : 0
  const habitRate = stats && stats.habitCheckIns > 0 && habits.length > 0
    ? Math.round((stats.habitCheckIns / (habits.length * 7)) * 100)
    : 0
  const focusDuration = stats?.focusDuration ?? 0
  const starsThisWeek = weeklyAch?.starsThisWeek ?? 0
  const moonsThisWeek = weeklyAch?.moonsThisWeek ?? 0

  // Reward rules
  const ruleHabitStandard = habitRate >= 80
  const ruleTaskStandard = taskRate >= 80

  const isEmpty = !loading && stats && stats.taskTotal === 0 && habits.length === 0

  if (!user) return null

  return (
    <View className={styles.container} data-testid='ranking-page'>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>本周评比</Text>
      </View>

      {/* 周选择器 */}
      <View className={styles.weekSelector}>
        <View className={styles.weekNav} onClick={() => shiftWeek(-1)} data-testid='btn-prev-week'>
          <Text className={styles.weekNavText}>◀</Text>
        </View>
        <Text className={styles.weekTitle} data-testid='week-title'>
          {formatWeekTitle(weekMonday)}
        </Text>
        <View
          className={[styles.weekNav, isCurrentWeek ? styles.weekNavDisabled : ''].join(' ')}
          onClick={isCurrentWeek ? undefined : () => shiftWeek(1)}
          data-testid='btn-next-week'
        >
          <Text className={styles.weekNavText}>▶</Text>
        </View>
      </View>

      <ScrollView scrollY className={styles.content}>
        {/* 总评卡片 */}
        <View className={styles.summaryCard} data-testid='weekly-summary-card'>
          <Text className={styles.summaryCardTitle}>📊 本周综合表现</Text>
          <View className={styles.summaryStats}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue} data-testid='task-completion-rate'>
                {taskRate}%
              </Text>
              <Text className={styles.summaryLabel}>任务完成率</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue} data-testid='habit-completion-rate'>
                {habitRate}%
              </Text>
              <Text className={styles.summaryLabel}>习惯打卡率</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue} data-testid='focus-duration'>
                {focusDuration}分
              </Text>
              <Text className={styles.summaryLabel}>专注时长</Text>
            </View>
          </View>
          {/* 星星总计 */}
          <View className={styles.starsRow}>
            <View className={styles.starsItem}>
              <Text className={styles.starsIcon}>⭐</Text>
              <Text className={styles.starsCount} data-testid='weekly-stars'>{starsThisWeek}</Text>
            </View>
            <View className={styles.starsItem}>
              <Text className={styles.starsIcon}>🌙</Text>
              <Text className={styles.starsCount}>{moonsThisWeek}</Text>
            </View>
          </View>
        </View>

        {/* 空状态 */}
        {isEmpty && (
          <View className={styles.emptyState} data-testid='ranking-empty'>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>本周暂无数据</Text>
          </View>
        )}

        {/* 科目完成情况 */}
        <View className={styles.card} data-testid='subject-stats'>
          <Text className={styles.cardTitle}>📚 任务完成情况</Text>
          {stats && stats.taskTotal > 0 ? (
            <View className={styles.statRow}>
              <Text className={styles.statLabel}>本周完成</Text>
              <Text className={styles.statValue}>{stats.taskDone} / {stats.taskTotal}</Text>
            </View>
          ) : (
            <Text className={styles.emptyHint}>本周暂无任务</Text>
          )}
        </View>

        {/* 习惯打卡周历 */}
        <View className={styles.card}>
          <Text className={styles.cardTitle}>☑️ 习惯打卡记录</Text>
          <View className={styles.habitCalendar} data-testid='habit-weekly-calendar'>
            {weekDays.map((day, i) => (
              <View key={day} className={styles.weekDayItem} data-testid={`week-day-${i}`}>
                <Text className={styles.weekDayLabel}>{DAY_LABELS[i]}</Text>
                <Text className={styles.weekDayDate}>{day.slice(8)}</Text>
              </View>
            ))}
          </View>
          {habits.length > 0 && habits.map((habit) => (
            <View key={habit.id} className={styles.habitRow}>
              <Text className={styles.habitIcon}>{habit.icon}</Text>
              <Text className={styles.habitName}>{habit.name}</Text>
            </View>
          ))}
          {habits.length === 0 && (
            <Text className={styles.emptyHint}>本周暂无习惯</Text>
          )}
        </View>

        {/* 奖励规则 */}
        <View className={styles.card} data-testid='reward-rules-card'>
          <Text className={styles.cardTitle}>🎁 本周奖励规则</Text>

          <View className={styles.ruleItem} data-testid='rule-habit-standard'>
            <Text className={styles.ruleIcon}>☑️</Text>
            <Text className={styles.ruleName}>习惯打卡达标（≥80%）</Text>
            {ruleHabitStandard ? (
              <Text className={[styles.ruleTag, styles.ruleTagAchieved].join(' ')} data-testid='rule-achieved'>已获得</Text>
            ) : (
              <Text className={[styles.ruleTag, styles.ruleTagMissed].join(' ')} data-testid='rule-missed'>未达标</Text>
            )}
          </View>

          <View className={styles.ruleItem} data-testid='rule-task-standard'>
            <Text className={styles.ruleIcon}>📚</Text>
            <Text className={styles.ruleName}>任务完成达标（≥80%）</Text>
            {ruleTaskStandard ? (
              <Text className={[styles.ruleTag, styles.ruleTagAchieved].join(' ')} data-testid='rule-achieved'>已获得</Text>
            ) : (
              <Text className={[styles.ruleTag, styles.ruleTagMissed].join(' ')} data-testid='rule-missed'>未达标</Text>
            )}
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
        <View className={[styles.navItem, styles.navItemActive].join(' ')}>
          <Text className={styles.navIcon}>🏆</Text>
          <Text className={styles.navText}>评比</Text>
        </View>
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/profile/index' })}
        >
          <Text className={styles.navIcon}>👤</Text>
          <Text className={styles.navText}>我的</Text>
        </View>
      </View>
    </View>
  )
}
