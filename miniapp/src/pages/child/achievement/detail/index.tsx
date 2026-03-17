import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { achievementApi, HistoryRecord } from '../../../../services/api'
import styles from './index.module.scss'

export default function AchievementDetailPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (y: number, m: number) => {
    setLoading(true)
    try {
      const data = await achievementApi.getHistory(y, m)
      setRecords(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useDidShow(() => { load(year, month) })

  const handlePrevMonth = () => {
    const newMonth = month === 1 ? 12 : month - 1
    const newYear = month === 1 ? year - 1 : year
    setYear(newYear)
    setMonth(newMonth)
    load(newYear, newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = month === 12 ? 1 : month + 1
    const newYear = month === 12 ? year + 1 : year
    setYear(newYear)
    setMonth(newMonth)
    load(newYear, newMonth)
  }

  const today = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const recordMap = new Map(records.map((r) => [r.date, r.stars]))

  const days: Array<{ date: string | null; stars: number }> = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, stars: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, stars: recordMap.get(dateStr) ?? 0 })
  }

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.navBtn} onClick={handlePrevMonth}>{'<'}</Text>
        <Text className={styles.monthTitle}>{year}年{month}月</Text>
        <Text className={styles.navBtn} onClick={handleNextMonth}>{'>'}</Text>
      </View>

      {loading ? (
        <Text className={styles.loading}>加载中...</Text>
      ) : (
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
                      <Text className={styles.calendarStars}>{day.stars}⭐</Text>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
