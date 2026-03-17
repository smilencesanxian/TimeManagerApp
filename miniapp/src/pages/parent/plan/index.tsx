import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { useHabitStore } from '../../../store/habitStore'
import { Habit, authApi } from '../../../services/api'
import styles from './index.module.scss'

type Tab = 'tasks' | 'habits'

export default function ParentPlanPage() {
  const { habits, loading, fetchHabits, removeHabit } = useHabitStore()
  const [activeTab, setActiveTab] = useState<Tab>('habits')
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)

  const getParamsFromRouter = (): Record<string, string> => {
    return (Taro.getCurrentInstance?.()?.router?.params ?? {}) as Record<string, string>
  }

  useDidShow(() => {
    const params = getParamsFromRouter()
    const childIdParam = params['childId']
    const tabParam = params['tab']
    if (tabParam === 'habits') setActiveTab('habits')
    if (childIdParam) {
      fetchHabits(childIdParam)
    } else {
      authApi.getChildren().then((children) => {
        if (children.length > 0) fetchHabits(children[0].id)
      }).catch(() => { /* ignore */ })
    }
  })

  const handleAddHabit = useCallback(() => {
    Taro.navigateTo({ url: '/pages/parent/habit/create/index' })
  }, [])

  const handleDeleteHabit = useCallback((habit: Habit) => {
    setDeleteTarget(habit)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const { habitApi } = await import('../../../services/api')
      await habitApi.delete(deleteTarget.id)
      removeHabit(deleteTarget.id)
    } catch { /* ignore */ }
    setDeleteTarget(null)
  }, [deleteTarget, removeHabit])

  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  const handleEditHabit = useCallback((id: string) => {
    Taro.navigateTo({ url: `/pages/parent/habit/edit/index?id=${id}` })
  }, [])

  const handleDeleteClick = useCallback((e: { stopPropagation?: () => void }, habit: Habit) => {
    e.stopPropagation?.()
    handleDeleteHabit(habit)
  }, [handleDeleteHabit])

  return (
    <View className={styles.container}>
      {/* Tab Bar */}
      <View className={styles.tabBar}>
        <View
          className={[styles.tab, activeTab === 'tasks' ? styles.tabActive : ''].join(' ')}
          data-testid="tab-tasks"
          onClick={() => setActiveTab('tasks')}
        >
          <Text>任务计划</Text>
        </View>
        <View
          className={[styles.tab, activeTab === 'habits' ? styles.tabActive : ''].join(' ')}
          data-testid="tab-habits"
          onClick={() => setActiveTab('habits')}
        >
          <Text>习惯打卡</Text>
        </View>
      </View>

      {activeTab === 'habits' && (
        <View className={styles.habitsContent}>
          {/* Add button */}
          <View className={styles.addRow}>
            <View
              className={styles.addBtn}
              data-testid="btn-add-habit"
              onClick={handleAddHabit}
            >
              <Text className={styles.addBtnText}>+ 添加习惯</Text>
            </View>
          </View>

          {/* Habit list */}
          {loading ? (
            <Text className={styles.loadingText}>加载中...</Text>
          ) : habits.length === 0 ? (
            <View data-testid="habit-list-empty" className={styles.emptyState}>
              <Text className={styles.emptyText}>还没有习惯打卡项</Text>
              <Text className={styles.emptyHint}>点击上方按钮添加第一个习惯</Text>
            </View>
          ) : (
            <View className={styles.habitList}>
              {habits.map((habit) => (
                <View
                  key={habit.id}
                  className={[styles.habitCard, habit.checkedIn ? styles.checkedCard : ''].join(' ')}
                  data-habit-id={habit.id}
                  data-habit-name={habit.name}
                  onClick={() => handleEditHabit(habit.id)}
                >
                  <View className={styles.habitLeft}>
                    <Text className={styles.habitIcon}>{habit.icon}</Text>
                    <View className={styles.habitInfo}>
                      <Text className={styles.habitName}>{habit.name}</Text>
                      <Text
                        className={styles.habitFrequency}
                        data-testid="habit-frequency-label"
                      >
                        {habit.frequency === 'daily' ? '每天' : '每周'}
                        {habit.frequency === 'weekly' && habit.weekdays
                          ? ` ${(JSON.parse(habit.weekdays) as number[]).map((d) => ['', '一', '二', '三', '四', '五', '六', '日'][d]).join('、')}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <View className={styles.habitRight}>
                    {habit.checkedIn && (
                      <Text className={styles.checkedIcon} data-testid="habit-checked-icon">✅</Text>
                    )}
                    <View
                      className={styles.deleteBtn}
                      data-testid="btn-delete-habit"
                      onClick={(e) => handleDeleteClick(e, habit)}
                    >
                      <Text className={styles.deleteBtnText}>🗑️</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'tasks' && (
        <View className={styles.tasksContent}>
          <Text className={styles.placeholderText}>任务计划 - Phase 6 开发中</Text>
        </View>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <View className={styles.modalOverlay} data-testid="delete-confirm-modal">
          <View className={styles.modal}>
            <Text className={styles.modalTitle}>确认删除</Text>
            <Text className={styles.modalBody}>确定要删除习惯「{deleteTarget.name}」吗？</Text>
            <View className={styles.modalActions}>
              <View
                className={styles.modalBtnSecondary}
                data-testid="btn-cancel-delete"
                onClick={cancelDelete}
              >
                <Text>取消</Text>
              </View>
              <View
                className={styles.modalBtnPrimary}
                data-testid="btn-confirm-delete"
                onClick={confirmDelete}
              >
                <Text>确认删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
