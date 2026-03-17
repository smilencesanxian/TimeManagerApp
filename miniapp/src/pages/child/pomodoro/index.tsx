import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { taskApi, pomodoroApi, achievementApi, Task, PomodoroSession } from '../../../services/api'
import { useTaskStore } from '../../../store/taskStore'
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

// 番茄钟 SVG 环形参数（基于 viewBox 200×200）
const RING_R = 88
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R // ≈ 552.9

const FOCUS_TOTAL = 25 * 60
const BREAK_TOTAL = 5 * 60

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// 根据剩余比例计算环形颜色
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
      {/* SVG 环形 */}
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 200 200'
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 背景轨道 */}
        <circle
          cx='100'
          cy='100'
          r={RING_R}
          fill='none'
          stroke='#E2E8F0'
          strokeWidth='12'
        />
        {/* 进度弧 */}
        <circle
          cx='100'
          cy='100'
          r={RING_R}
          fill='none'
          stroke={color}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>

      {/* 环内文字 */}
      <View className={styles.ringContent}>
        <Text className={styles.ringTime} style={{ color }} data-testid='timer-display'>
          {formatSeconds(remaining)}
        </Text>
        <Text className={styles.ringLabel} data-testid='phase-label'>{PHASE_LABEL[phase]}</Text>
      </View>
    </View>
  )
}

export default function PomodoroPage() {
  const router = useRouter()
  const { updateTaskStatus } = useTaskStore()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionStars, setCompletionStars] = useState(1)
  const [showDailyBonus, setShowDailyBonus] = useState(false)

  const timer = usePomodoroTimer()
  const currentSessionRef = useRef<PomodoroSession | null>(null)
  const prevPhaseRef = useRef(timer.phase)

  const taskId = router.params['taskId'] as string

  useEffect(() => {
    if (!taskId) return
    taskApi.getById(taskId)
      .then(t => setTask(t))
      .catch(() => Taro.showToast({ title: '任务加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [taskId])

  useEffect(() => {
    const prev = prevPhaseRef.current
    const curr = timer.phase
    prevPhaseRef.current = curr

    const syncPhase = async () => {
      try {
        if (curr === 'focusing' && prev === 'idle') {
          const session = await pomodoroApi.startSession(taskId, 'focus', 25)
          currentSessionRef.current = session
          await updateTaskStatus(taskId, 'doing')
        }
        if (curr === 'focusing' && prev === 'breakDone') {
          const session = await pomodoroApi.startSession(taskId, 'focus', 25)
          currentSessionRef.current = session
        }
        if (curr === 'onBreak' && prev === 'focusing') {
          if (currentSessionRef.current) {
            await pomodoroApi.endSession(currentSessionRef.current.id, true)
          }
          const breakSession = await pomodoroApi.startSession(taskId, 'break', 5)
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
          await updateTaskStatus(taskId, 'done')
          // Check if all today's tasks are now done (for daily bonus)
          try {
            const todayTasks = await taskApi.today()
            const allDone = todayTasks.length > 0 && todayTasks.every((t: Task) => t.status === 'done')
            setShowDailyBonus(allDone)
            // Load star reward from achievement summary
            const summary = await achievementApi.getSummary()
            setCompletionStars(summary.stars + summary.moons * 10 + summary.suns * 100)
          } catch { /* ignore */ }
          setShowCompletion(true)
        }
      } catch (e: unknown) {
        console.warn('pomodoro sync error:', e)
      }
    }

    syncPhase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.phase])

  const handleBack = useCallback(() => Taro.navigateBack(), [])
  const handleStart = useCallback(() => timer.start(), [timer])
  const handlePause = useCallback(() => timer.pause(), [timer])
  const handleResume = useCallback(() => timer.resume(), [timer])
  const handleFinishTask = useCallback(() => setShowFinishModal(true), [])
  const handleConfirmFinish = useCallback(() => { setShowFinishModal(false); timer.finish() }, [timer])
  const handleCancelFinish = useCallback(() => setShowFinishModal(false), [])
  const handleStartNextPomodoro = useCallback(() => timer.startNextPomodoro(), [timer])

  if (loading) {
    return (
      <View className={styles.container}>
        <View className={styles.navbar}>
          <View className={styles.backBtn} onClick={handleBack}>
            <Text className={styles.backText}>‹ 返回</Text>
          </View>
          <Text className={styles.navTitle}>专注计时</Text>
          <View className={styles.navRight} />
        </View>
        <View className={styles.loadingState}>
          <View className={[styles.skeletonItem, styles.skeletonTitle].join(' ')} />
          <View className={[styles.skeletonItem, styles.skeletonRing].join(' ')} />
        </View>
      </View>
    )
  }

  if (!task) {
    return (
      <View className={styles.container}>
        <View className={styles.navbar}>
          <View className={styles.backBtn} onClick={handleBack}>
            <Text className={styles.backText}>‹ 返回</Text>
          </View>
          <Text className={styles.navTitle}>专注计时</Text>
          <View className={styles.navRight} />
        </View>
        <View className={styles.emptyState}>
          <Text className={styles.emptyText}>任务不存在</Text>
        </View>
      </View>
    )
  }

  const cfg = SUBJECT_CONFIG[task.subject] ?? SUBJECT_CONFIG['其他']
  const isOnBreak = timer.phase === 'onBreak' || timer.phase === 'breakDone'
  const totalForPhase = isOnBreak ? BREAK_TOTAL : FOCUS_TOTAL
  const canStart = timer.phase === 'idle'
  const canPause = timer.phase === 'focusing'
  const canResume = timer.phase === 'paused'
  const canFinish = ['focusing', 'paused', 'onBreak', 'breakDone'].includes(timer.phase)
  const isBreakDone = timer.phase === 'breakDone'

  return (
    <View className={[styles.container, isOnBreak ? styles.containerBreak : ''].join(' ')}>
      {/* ===== 导航栏 ===== */}
      <View className={styles.navbar}>
        <View className={styles.backBtn} onClick={handleBack}>
          <Text className={styles.backText}>‹ 返回</Text>
        </View>
        <Text className={styles.navTitle}>专注计时</Text>
        <View className={styles.navRight} />
      </View>

      {/* ===== 任务信息 ===== */}
      <View className={styles.taskInfo}>
        <View className={[styles.taskSubjectIcon, cfg.bgClass].join(' ')}>
          <Text className={styles.taskSubjectIconText}>{cfg.icon}</Text>
        </View>
        <Text className={styles.taskTitle}>{task.title}</Text>
        <Text className={styles.taskMeta}>{task.subject} · 预计 {task.duration} 分钟</Text>
      </View>

      {/* ===== 时长信息 ===== */}
      <View className={styles.durationRow}>
        <View className={styles.durationItem}>
          <Text className={styles.durationLabel}>预计时长</Text>
          <Text className={styles.durationValue}>{task.duration} 分钟</Text>
        </View>
        <View className={styles.durationDivider} />
        <View className={styles.durationItem}>
          <Text className={styles.durationLabel}>已专注</Text>
          <Text className={styles.durationValue}>{Math.floor(timer.elapsedFocusSec / 60)} 分钟</Text>
        </View>
        <View className={styles.durationDivider} />
        <View className={styles.durationItem}>
          <Text className={styles.durationLabel}>番茄数</Text>
          <Text className={styles.durationValue}>🍅 ×{timer.pomodoroCount}</Text>
        </View>
      </View>

      {/* ===== 环形进度条 ===== */}
      <View className={styles.ringWrapper}>
        <PomodoroRing
          remaining={timer.remaining}
          total={totalForPhase}
          phase={timer.phase}
        />
      </View>

      {/* ===== 控制按钮 ===== */}
      <View className={styles.controls}>
        {canStart && (
          <View className={styles.btnPrimary} onClick={handleStart} data-testid='btn-start-focus'>
            <Text className={styles.btnPrimaryText}>▶ 开始专注</Text>
          </View>
        )}

        {canPause && (
          <View className={styles.btnSecondary} onClick={handlePause} data-testid='btn-pause'>
            <Text className={styles.btnSecondaryText}>⏸ 暂停</Text>
          </View>
        )}

        {canResume && (
          <View className={styles.btnPrimary} onClick={handleResume} data-testid='btn-resume'>
            <Text className={styles.btnPrimaryText}>▶ 继续</Text>
          </View>
        )}

        {isBreakDone && (
          <View className={styles.btnPrimary} onClick={handleStartNextPomodoro} data-testid='btn-next-pomodoro'>
            <Text className={styles.btnPrimaryText}>▶ 继续学习</Text>
          </View>
        )}

        {canFinish && (
          <View className={styles.btnFinish} onClick={handleFinishTask} data-testid='btn-finish-task'>
            <Text className={styles.btnFinishText}>✓ 完成任务</Text>
          </View>
        )}
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
              <View className={styles.modalBtnCancel} onClick={handleCancelFinish}>
                <Text className={styles.modalBtnCancelText}>继续学习</Text>
              </View>
              <View
                className={styles.modalBtnConfirm}
                onClick={handleConfirmFinish}
                data-testid='btn-confirm-finish'
              >
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
          <Text data-testid='completion-star-reward' className={styles.completionStars}>
            +1 ⭐
          </Text>
          <Text className={styles.completionDesc}>
            专注了 {Math.floor(timer.elapsedFocusSec / 60)} 分钟{'\n'}
            完成 {timer.pomodoroCount} 个番茄钟{'\n'}
            累计获得 {completionStars} 星
          </Text>
          {showDailyBonus && (
            <View data-testid='daily-complete-bonus' className={styles.dailyBonus}>
              <Text className={styles.dailyBonusText}>🎊 今日全部完成 +1 额外奖励！</Text>
            </View>
          )}
          <View
            className={styles.completionBtn}
            data-testid='btn-back-to-tasks'
            onClick={() => {
              setShowCompletion(false)
              Taro.navigateBack()
            }}
          >
            <Text className={styles.completionBtnText}>返回任务列表</Text>
          </View>
        </View>
      )}
    </View>
  )
}
