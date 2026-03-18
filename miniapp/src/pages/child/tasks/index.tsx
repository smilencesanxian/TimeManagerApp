import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { useTaskStore } from '../../../store/taskStore'
import { useHabitStore } from '../../../store/habitStore'
import { wsClient } from '../../../services/wsClient'
import { authApi, pomodoroApi, achievementApi, AchievementSummary, Task, PomodoroSession } from '../../../services/api'
import { usePomodoroTimer } from '../../../hooks/usePomodoroTimer'
import styles from './index.module.scss'

const SUBJECT_CONFIG: Record<string, { icon: string; bgClass: string }> = {
  语文: { icon: '📖', bgClass: styles.subjectChinese },
  数学: { icon: '📐', bgClass: styles.subjectMath },
  英语: { icon: '🔤', bgClass: styles.subjectEnglish },
  阅读: { icon: '📚', bgClass: styles.subjectChinese },
  运动: { icon: '🏃', bgClass: styles.subjectOther },
  其他: { icon: '📝', bgClass: styles.subjectOther },
}

const PHASE_LABEL: Record<string, string> = {
  idle: '准备开始',
  focusing: '专注中',
  paused: '已暂停',
  onBreak: '休息中',
  breakDone: '休息结束',
  completed: '已完成',
}

const RING_R = 88
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R
const FOCUS_TOTAL = 25 * 60
const BREAK_TOTAL = 5 * 60

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getRingColor(ratio: number): string {
  if (ratio > 0.6) return '#22C55E'
  if (ratio > 0.3) return '#F59E0B'
  return '#EF4444'
}

interface PomodoroRingProps {
  remaining: number
  total: number
  phase: string
}

function PomodoroRing({ remaining, total, phase }: PomodoroRingProps) {
  const ratio = total > 0 ? remaining / total : 1
  const offset = RING_CIRCUMFERENCE * (1 - ratio)
  const color = phase === 'onBreak' ? '#22C55E' : getRingColor(ratio)
  const isPulse = phase === 'focusing' && ratio < 0.1

  return (
    <View className={[styles.ringContainer, isPulse ? styles.ringPulse : ''].join(' ')}>
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 200 200'
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle cx='100' cy='100' r={RING_R} fill='none' stroke='#E2E8F0' strokeWidth='12' />
        <circle
          cx='100' cy='100' r={RING_R}
          fill='none'
          stroke={color}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <View className={styles.ringContent}>
        <Text className={styles.ringTime} style={{ color }} data-testid='timer-display'>
          {formatSeconds(remaining)}
        </Text>
        <Text className={styles.ringLabel} data-testid='phase-label'>
          {PHASE_LABEL[phase]}
        </Text>
      </View>
    </View>
  )
}

export default function ChildTasksPage() {
  const { user, token, clearAuth } = useAuthStore()
  const { tasks, isLoading, fetchTodayTasks, updateTaskStatus, applyStatusUpdate, appendTask, removeTask } = useTaskStore()
  const { habits, fetchHabits, checkIn: doCheckIn, cancelCheckIn: doUncheckin } = useHabitStore()

  const [familyId, setFamilyId] = useState<string | null | undefined>(undefined)
  const [inviteCode, setInviteCode] = useState('')
  const [binding, setBinding] = useState(false)
  const [localStars, setLocalStars] = useState(0)
  const [starFloat, setStarFloat] = useState(false)
  const [checkinError, setCheckinError] = useState<string | null>(null)
  const [achievementSummary, setAchievementSummary] = useState<AchievementSummary | null>(null)
  const [conversionToast, setConversionToast] = useState<string | null>(null)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [levelUpTitle, setLevelUpTitle] = useState('')

  // 右侧面板：当前选中任务
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const timer = usePomodoroTimer()
  const currentSessionRef = useRef<PomodoroSession | null>(null)
  const prevPhaseRef = useRef(timer.phase)
  // 使用 ref 在 effect 中访问最新 selectedTask，避免 stale closure
  const selectedTaskRef = useRef<Task | null>(null)

  useEffect(() => {
    selectedTaskRef.current = selectedTask
  }, [selectedTask])

  // 番茄钟阶段变化 → 同步 API
  useEffect(() => {
    const prev = prevPhaseRef.current
    const curr = timer.phase
    prevPhaseRef.current = curr

    const task = selectedTaskRef.current
    if (!task) return

    const syncPhase = async () => {
      try {
        if (curr === 'focusing' && prev === 'idle') {
          const session = await pomodoroApi.startSession(task.id, 'focus', 25)
          currentSessionRef.current = session
          await updateTaskStatus(task.id, 'doing')
        }
        if (curr === 'focusing' && prev === 'breakDone') {
          const session = await pomodoroApi.startSession(task.id, 'focus', 25)
          currentSessionRef.current = session
        }
        if (curr === 'onBreak' && prev === 'focusing') {
          if (currentSessionRef.current) {
            await pomodoroApi.endSession(currentSessionRef.current.id, true)
          }
          const breakSession = await pomodoroApi.startSession(task.id, 'break', 5)
          currentSessionRef.current = breakSession
        }
        if (curr === 'breakDone' && prev === 'onBreak') {
          if (currentSessionRef.current) {
            await pomodoroApi.endSession(currentSessionRef.current.id, true)
            currentSessionRef.current = null
          }
        }
        if (curr === 'completed' && prev !== 'completed') {
          if (currentSessionRef.current) {
            await pomodoroApi.endSession(currentSessionRef.current.id, false)
            currentSessionRef.current = null
          }
          await updateTaskStatus(task.id, 'done')
          // Refresh achievement BEFORE showing overlay so star-count is already updated
          await loadAchievement()
          setShowCompletion(true)
        }
      } catch (e: unknown) {
        console.warn('pomodoro sync error:', e)
      }
    }
    syncPhase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.phase])

  const handleLogout = useCallback(() => {
    Taro.showModal({
      title: '确认登出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          wsClient.disconnect()
          clearAuth()
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      },
    })
  }, [clearAuth])

  const loadTasks = useCallback(async () => {
    await fetchTodayTasks()
  }, [fetchTodayTasks])

  const loadAchievement = useCallback(async () => {
    try {
      const summary = await achievementApi.getSummary()
      setAchievementSummary(summary)
    } catch { /* ignore */ }
  }, [])

  const checkBinding = useCallback(async () => {
    try {
      const me = await authApi.getMe()
      setFamilyId(me.familyId)
      if (me.familyId) {
        await loadTasks()
        await fetchHabits()
        await loadAchievement()
      }
    } catch {
      setFamilyId(null)
    }
  }, [loadTasks, fetchHabits, loadAchievement])

  useEffect(() => {
    checkBinding()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useDidShow(() => {
    checkBinding()
    if (token) {
      wsClient.connect(token)
      const onStatusChanged = (data: unknown) => {
        const payload = data as { taskId: string; status: Task['status'] }
        applyStatusUpdate(payload.taskId, payload.status)
      }
      const onTaskCreated = (data: unknown) => {
        const task = data as Task
        appendTask(task)
        Taro.showToast({ title: `新任务：${task.title}`, icon: 'none' })
      }
      const onTaskDeleted = (data: unknown) => {
        removeTask((data as { taskId: string }).taskId)
      }
      wsClient.on('task:status_changed', onStatusChanged)
      wsClient.on('task:created', onTaskCreated)
      wsClient.on('task:deleted', onTaskDeleted)
    }
  })

  const handleBind = async () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }
    setBinding(true)
    try {
      await authApi.bindInvite(inviteCode.trim().toUpperCase())
      Taro.showToast({ title: '绑定成功！', icon: 'success' })
      setInviteCode('')
      await checkBinding()
    } catch (e: unknown) {
      Taro.showToast({ title: (e as Error).message || '绑定失败', icon: 'none' })
    } finally {
      setBinding(false)
    }
  }

  const handleTaskSelect = (task: Task) => {
    if (task.status === 'done') return
    if (selectedTask?.id !== task.id) {
      // 切换任务时重置计时器
      timer.reset()
      currentSessionRef.current = null
    }
    setSelectedTask(task)
  }

  const handleConfirmFinish = useCallback(() => {
    setShowFinishModal(false)
    timer.finish()
  }, [timer])

  const handleHabitCheckin = useCallback(async (habitId: string, checkedIn: boolean) => {
    try {
      setCheckinError(null)
      if (checkedIn) {
        const stars = await doUncheckin(habitId)
        setLocalStars((prev) => Math.max(0, prev - stars))
        await loadAchievement()
      } else {
        const prevSummary = achievementSummary
        const stars = await doCheckIn(habitId)
        setLocalStars((prev) => prev + stars)
        setStarFloat(true)
        setTimeout(() => setStarFloat(false), 1500)
        // Refresh real achievement summary from API
        const newSummary = await achievementApi.getSummary()
        setAchievementSummary(newSummary)
        // Detect conversion events
        if (prevSummary) {
          if (newSummary.suns > prevSummary.suns) {
            setConversionToast('太阳')
            setTimeout(() => setConversionToast(null), 3000)
          } else if (newSummary.moons > prevSummary.moons) {
            setConversionToast('月亮')
            setTimeout(() => setConversionToast(null), 3000)
          }
          if (newSummary.level > prevSummary.level) {
            setLevelUpTitle(newSummary.levelTitle)
            setShowLevelUpModal(true)
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      setCheckinError(error.message || '操作失败')
      setTimeout(() => setCheckinError(null), 3000)
    }
  }, [doCheckIn, doUncheckin, achievementSummary, loadAchievement])

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const todayStars = done + localStars

  // ===== 未绑定家长：显示绑定引导页 =====
  if (familyId === null) {
    return (
      <View className={styles.container}>
        <View className={styles.statusBar}>
          <View className={styles.achievements}>
            <View className={styles.achievementItem}>
              <Text className={styles.achievementIcon}>⭐</Text>
              <Text className={styles.achievementValue} data-testid="star-count">0</Text>
            </View>
            <View className={styles.achievementItem}>
              <Text className={styles.achievementIcon}>🌙</Text>
              <Text className={styles.achievementValue} data-testid="moon-count">0</Text>
            </View>
            <View className={styles.achievementItem}>
              <Text className={styles.achievementIcon}>☀️</Text>
              <Text className={styles.achievementValue} data-testid="sun-count">0</Text>
            </View>
          </View>
          <Text className={styles.greetingText}>你好，{user?.nickname ?? '小朋友'}</Text>
        </View>

        <View className={styles.bindPage}>
          <View className={styles.bindCard}>
            <Text className={styles.bindEmoji}>🔗</Text>
            <Text className={styles.bindTitle}>绑定家长账号</Text>
            <Text className={styles.bindDesc}>
              让家长打开 App 生成邀请码{'\n'}然后输入到下方
            </Text>
            <Input
              className={styles.bindInput}
              placeholder='输入邀请码（如：ABC12345）'
              value={inviteCode}
              onInput={(e) => setInviteCode(e.detail.value)}
              data-testid='input-invite-code'
            />
            <View
              className={[styles.bindBtn, binding ? styles.bindBtnDisabled : ''].join(' ')}
              onClick={binding ? undefined : handleBind}
              data-testid='btn-bind'
            >
              <Text className={styles.bindBtnText}>{binding ? '绑定中...' : '确认绑定'}</Text>
            </View>
          </View>
          <View className={styles.logoutLink} onClick={handleLogout} data-testid='btn-logout'>
            <Text className={styles.logoutLinkText}>退出登录</Text>
          </View>
        </View>
      </View>
    )
  }

  // ===== 已绑定：双面板布局 =====
  const isOnBreak = timer.phase === 'onBreak' || timer.phase === 'breakDone'
  const totalForPhase = isOnBreak ? BREAK_TOTAL : FOCUS_TOTAL
  const canStart = timer.phase === 'idle'
  const canPause = timer.phase === 'focusing'
  const canResume = timer.phase === 'paused'
  const isBreakDone = timer.phase === 'breakDone'
  const canFinish = ['focusing', 'paused', 'onBreak', 'breakDone'].includes(timer.phase)

  return (
    <View className={styles.container}>
      {/* ===== 顶部状态栏 ===== */}
      <View className={styles.statusBar}>
        <View
          className={styles.achievements}
          onClick={() => Taro.navigateTo({ url: '/pages/child/achievements/index' })}
        >
          <View className={styles.achievementItem}>
            <Text className={styles.achievementIcon}>⭐</Text>
            {achievementSummary !== null && (
              <Text className={styles.achievementValue} data-testid="star-count">
                {achievementSummary.stars}
              </Text>
            )}
          </View>
          <View className={styles.achievementItem}>
            <Text className={styles.achievementIcon}>🌙</Text>
            {achievementSummary !== null && (
              <Text className={styles.achievementValue} data-testid="moon-count">
                {achievementSummary.moons}
              </Text>
            )}
          </View>
          <View className={styles.achievementItem}>
            <Text className={styles.achievementIcon}>☀️</Text>
            {achievementSummary !== null && (
              <Text className={styles.achievementValue} data-testid="sun-count">
                {achievementSummary.suns}
              </Text>
            )}
          </View>
        </View>

        <View className={styles.focusStatus}>
          <Text className={styles.focusIcon}>🍅</Text>
          <Text className={styles.focusText}>专注</Text>
          <Text className={styles.focusCount}>{done}/{total}</Text>
        </View>

        <View className={styles.statusActions}>
          <View className={styles.iconBtn} onClick={handleLogout} data-testid='btn-logout'>
            <Text className={styles.iconBtnText}>👤</Text>
          </View>
        </View>
      </View>

      {/* ===== 主体：左右双面板 ===== */}
      <View className={styles.mainContent}>
        {/* ===== 左侧：任务列表（60%）===== */}
        <View className={styles.taskListPanel}>
          <View className={styles.panelHeader}>
            <Text className={styles.panelTitle}>今日任务</Text>
            <Text className={styles.panelIcon}>📋</Text>
          </View>

          {isLoading || familyId === undefined ? (
            <View className={styles.skeletonList}>
              {[1, 2, 3].map((i) => <View key={i} className={styles.skeletonItem} />)}
            </View>
          ) : tasks.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>🎉</Text>
              <Text className={styles.emptyTitle}>今天还没有任务</Text>
              <Text className={styles.emptyDesc}>好好休息或自由阅读吧</Text>
            </View>
          ) : (
            <ScrollView scrollY className={styles.taskListScroll} data-testid='task-list'>
              {tasks.map((task) => {
                const cfg = SUBJECT_CONFIG[task.subject] ?? SUBJECT_CONFIG['其他']
                const isActive = task.status === 'doing'
                const isDone = task.status === 'done'
                const isSelected = selectedTask?.id === task.id
                return (
                  <View
                    key={task.id}
                    className={[
                      styles.taskCard,
                      isSelected ? styles.taskCardActive : '',
                      isDone ? styles.taskCardDone : '',
                    ].join(' ')}
                    data-testid='task-item'
                    data-task-id={task.id}
                    onClick={() => handleTaskSelect(task)}
                  >
                    <View className={[styles.subjectIcon, cfg.bgClass].join(' ')}>
                      <Text className={styles.subjectIconText}>{cfg.icon}</Text>
                    </View>
                    <View className={styles.taskInfo}>
                      <Text className={[styles.taskName, isDone ? styles.taskNameDone : ''].join(' ')}>
                        {task.title}
                      </Text>
                      <Text className={styles.taskMeta}>
                        {task.subject} · ⏱️ {task.duration}分钟
                      </Text>
                    </View>
                    <View className={styles.taskRight}>
                      {isDone ? (
                        <View className={styles.statusDone}>
                          <Text className={styles.statusDoneText}>✓</Text>
                        </View>
                      ) : isActive ? (
                        <View className={styles.statusActive} />
                      ) : (
                        <View className={styles.statusPending} />
                      )}
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          )}
        </View>

        {/* ===== 右侧：任务详情 + 番茄钟（40%）===== */}
        <View className={[styles.taskDetailPanel, isOnBreak ? styles.taskDetailPanelBreak : ''].join(' ')}>
          {!selectedTask ? (
            /* 未选中任务：引导状态 */
            <View className={styles.idleState}>
              <Text className={styles.idleEmoji}>📋</Text>
              <Text className={styles.idleTitle}>选择任务</Text>
              <Text className={styles.idleDesc}>点击左侧任务{'\n'}开始专注计时</Text>
            </View>
          ) : (
            /* 已选中任务：显示详情 + 番茄钟 */
            <>
              {/* 任务信息 */}
              <View className={[styles.detailSubjectIcon, (SUBJECT_CONFIG[selectedTask.subject] ?? SUBJECT_CONFIG['其他']).bgClass].join(' ')}>
                <Text className={styles.detailSubjectIconText}>
                  {(SUBJECT_CONFIG[selectedTask.subject] ?? SUBJECT_CONFIG['其他']).icon}
                </Text>
              </View>
              <Text className={styles.detailTitle}>{selectedTask.title}</Text>
              <Text className={styles.detailDesc}>{selectedTask.subject}</Text>

              {/* 时长信息 */}
              <View className={styles.durationRow}>
                <View className={styles.durationItem}>
                  <Text className={styles.durationLabel}>预计</Text>
                  <Text className={styles.durationValue}>{selectedTask.duration}分钟</Text>
                </View>
                <View className={styles.durationDivider} />
                <View className={styles.durationItem}>
                  <Text className={styles.durationLabel}>已专注</Text>
                  <Text className={styles.durationValue}>{Math.floor(timer.elapsedFocusSec / 60)}分钟</Text>
                </View>
              </View>

              {/* 整体进度条 */}
              <View className={styles.progressBarWrap}>
                <View
                  className={styles.progressBar}
                  style={{
                    width: `${Math.min(100, (timer.elapsedFocusSec / (selectedTask.duration * 60)) * 100).toFixed(1)}%`
                  }}
                />
              </View>

              {/* 番茄钟状态标签 */}
              {timer.phase !== 'idle' && (
                <View className={styles.pomodoroStatusRow}>
                  <Text className={styles.pomodoroStatusText}>
                    {isOnBreak ? '☕ 休息中' : `🔥 专注中 ${timer.pomodoroCount + 1}`}
                  </Text>
                </View>
              )}

              {/* 环形进度 */}
              <View className={styles.ringWrapper}>
                <PomodoroRing
                  remaining={timer.remaining}
                  total={totalForPhase}
                  phase={timer.phase}
                />
              </View>

              {/* 控制按钮 */}
              <View className={styles.controls}>
                {canStart && (
                  <View className={styles.btnPrimary} onClick={() => timer.start()} data-testid='btn-start-focus'>
                    <Text className={styles.btnText}>▶ 开始专注</Text>
                  </View>
                )}
                {canPause && (
                  <View className={styles.btnSecondary} onClick={() => timer.pause()} data-testid='btn-pause'>
                    <Text className={styles.btnSecondaryText}>⏸ 暂停</Text>
                  </View>
                )}
                {canResume && (
                  <View className={styles.btnPrimary} onClick={() => timer.resume()} data-testid='btn-resume'>
                    <Text className={styles.btnText}>▶ 继续</Text>
                  </View>
                )}
                {isBreakDone && (
                  <View className={styles.btnPrimary} onClick={() => timer.startNextPomodoro()} data-testid='btn-next-pomodoro'>
                    <Text className={styles.btnText}>▶ 继续学习</Text>
                  </View>
                )}
                {canFinish && (
                  <View className={styles.btnFinish} onClick={() => setShowFinishModal(true)} data-testid='btn-finish-task'>
                    <Text className={styles.btnFinishText}>✓ 完成任务</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      {/* ===== 习惯打卡 ===== */}
      {habits.length > 0 && (
        <View className={styles.habitSection}>
          <View className={styles.habitSectionHeader}>
            <Text className={styles.habitSectionTitle}>📅 习惯打卡</Text>
          </View>
          <View data-testid="habit-list" className={styles.habitListRow}>
            {habits.map((habit) => (
              <View
                key={habit.id}
                className={[styles.habitItem, habit.checkedIn ? styles.habitItemChecked : ''].join(' ')}
                data-habit-id={habit.id}
              >
                <View className={styles.habitItemLeft}>
                  <Text className={styles.habitItemIcon}>{habit.icon}</Text>
                  <View className={styles.habitItemInfo}>
                    <Text className={styles.habitItemName}>{habit.name}</Text>
                    <Text className={styles.habitItemStreak} data-testid="habit-streak">
                      🔥 {habit.streak}天连击
                    </Text>
                  </View>
                </View>
                <View className={styles.habitItemRight}>
                  {habit.checkedIn ? (
                    <View
                      className={styles.habitCheckedBtn}
                      data-testid="habit-checkin-btn"
                      onClick={() => handleHabitCheckin(habit.id, true)}
                    >
                      <Text data-testid="habit-checked-icon">✅</Text>
                    </View>
                  ) : (
                    <View
                      className={styles.habitUncheckedBtn}
                      data-testid="habit-checkin-btn"
                      onClick={() => handleHabitCheckin(habit.id, false)}
                    >
                      <Text className={styles.habitUncheckedText}>打卡</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
          {starFloat && (
            <View className={styles.starFloatAnimation} data-testid="star-float-animation">
              <Text>⭐ +1</Text>
            </View>
          )}
          {checkinError && (
            <View className={styles.errorToast} data-testid="error-toast">
              <Text>{checkinError}</Text>
            </View>
          )}
        </View>
      )}

      {/* ===== 心语墙 ===== */}
      <View className={styles.heartwall}>
        <Text className={styles.heartwallIcon}>💬</Text>
        <Text className={styles.heartwallText}>继续加油，你是最棒的！</Text>
      </View>

      {/* ===== 底部导航 ===== */}
      <View className={styles.bottomNav}>
        <View className={[styles.navItem, styles.navItemActive].join(' ')}>
          <Text className={styles.navIcon}>📋</Text>
          <Text className={styles.navText}>今日任务</Text>
        </View>
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/child/achievements/index' })}
        >
          <Text className={styles.navIcon}>🏆</Text>
          <Text className={styles.navText}>我的成就</Text>
        </View>
      </View>

      {/* ===== 完成确认弹窗 ===== */}
      {showFinishModal && (
        <View className={styles.modalOverlay} data-testid='confirm-finish-modal'>
          <View className={styles.modal}>
            <Text className={styles.modalEmoji}>🎯</Text>
            <Text className={styles.modalTitle}>确认完成任务？</Text>
            <Text className={styles.modalDesc}>
              已专注 {Math.floor(timer.elapsedFocusSec / 60)} 分钟{'\n'}
              完成 {timer.pomodoroCount} 个番茄钟
            </Text>
            <View className={styles.modalActions}>
              <View className={styles.modalBtnCancel} onClick={() => setShowFinishModal(false)}>
                <Text className={styles.modalBtnCancelText}>继续学习</Text>
              </View>
              <View className={styles.modalBtnConfirm} onClick={handleConfirmFinish} data-testid='btn-confirm-finish'>
                <Text className={styles.modalBtnConfirmText}>确认完成</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 完成庆祝弹窗 ===== */}
      {showCompletion && (
        <View
          className={styles.completionOverlay}
          data-testid='completion-animation'
        >
          <Text className={styles.completionEmoji}>🎉</Text>
          <Text className={styles.completionTitle}>太棒了！</Text>
          <Text className={styles.completionStars}>⭐⭐⭐</Text>
          <Text className={styles.completionDesc}>
            专注了 {Math.floor(timer.elapsedFocusSec / 60)} 分钟{'\n'}
            完成 {timer.pomodoroCount} 个番茄钟
          </Text>
          <View
            className={styles.completionBtn}
            data-testid='btn-back-to-tasks'
            onClick={async () => {
              setShowCompletion(false)
              setSelectedTask(null)
              timer.reset()
              currentSessionRef.current = null
              await loadAchievement()
            }}
          >
            <Text className={styles.completionBtnText}>继续任务</Text>
          </View>
        </View>
      )}

      {/* ===== 兑换提示 ===== */}
      {conversionToast && (
        <View className={styles.conversionToast} data-testid="conversion-toast">
          <Text className={styles.conversionToastText}>
            🎉 恭喜！获得 1 个{conversionToast}！
          </Text>
        </View>
      )}

      {/* ===== 升级弹窗 ===== */}
      {showLevelUpModal && (
        <View className={styles.levelUpOverlay} data-testid="level-up-modal">
          <View className={styles.levelUpModal}>
            <Text className={styles.levelUpEmoji}>🎊</Text>
            <Text className={styles.levelUpTitle}>升级啦！</Text>
            <Text className={styles.levelUpDesc}>新称号：{levelUpTitle}</Text>
            <View
              className={styles.levelUpBtn}
              onClick={() => setShowLevelUpModal(false)}
            >
              <Text className={styles.levelUpBtnText}>太棒了！</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
