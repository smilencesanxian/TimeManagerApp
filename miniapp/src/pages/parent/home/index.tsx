import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useCallback, useRef } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { useTaskStore } from '../../../store/taskStore'
import { useHabitStore } from '../../../store/habitStore'
import { wsClient } from '../../../services/wsClient'
import { authApi, achievementApi, aiApi, AchievementSummary, Task } from '../../../services/api'
import styles from './index.module.scss'

const SUBJECTS = ['语文', '数学', '英语', '阅读', '运动', '其他']

const SUBJECT_CONFIG: Record<string, { icon: string; bgClass: string }> = {
  数学: { icon: '📐', bgClass: styles.subjectMath },
  语文: { icon: '📖', bgClass: styles.subjectChinese },
  英语: { icon: '🔤', bgClass: styles.subjectEnglish },
  阅读: { icon: '📚', bgClass: styles.subjectChinese },
  运动: { icon: '🏃', bgClass: styles.subjectOther },
  其他: { icon: '📝', bgClass: styles.subjectOther },
}

interface Child {
  id: string
  nickname: string
  avatarUrl: string | null
}

interface AddTaskForm {
  childId: string
  date: string
  subject: string
  title: string
  description: string
  duration: string
  priority: string
}

const DEFAULT_FORM = (childId = ''): AddTaskForm => ({
  childId,
  date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
  subject: '数学',
  title: '',
  description: '',
  duration: '30',
  priority: '2',
})

export default function ParentHomePage() {
  const { user, token, clearAuth } = useAuthStore()
  const { tasks, isLoading, fetchTodayTasks, createTask, deleteTask, applyStatusUpdate, appendTask, removeTask } = useTaskStore()
  const { habits, fetchHabits } = useHabitStore()

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [childAchievement, setChildAchievement] = useState<AchievementSummary | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showChildrenModal, setShowChildrenModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteChildNickname, setInviteChildNickname] = useState('')
  const [form, setForm] = useState<AddTaskForm>(DEFAULT_FORM())
  const [submitting, setSubmitting] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [descInput, setDescInput] = useState('')
  const [descError, setDescError] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'fallback'>('idle')
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadChildren = useCallback(async () => {
    try {
      const list = await authApi.getChildren()
      setChildren(list)
      if (list.length === 1 && !selectedChild) {
        setSelectedChild(list[0])
        await fetchTodayTasks(list[0].id)
        await fetchHabits(list[0].id)
        try {
          const ach = await achievementApi.getSummary(list[0].id)
          setChildAchievement(ach)
        } catch { /* ignore */ }
      }
    } catch {
      // ignore
    }
  }, [fetchTodayTasks, fetchHabits, selectedChild])

  useDidShow(() => {
    if (token) {
      wsClient.connect(token)
      const onStatusChanged = (data: unknown) => {
        const payload = data as { taskId: string; status: Task['status'] }
        applyStatusUpdate(payload.taskId, payload.status)
      }
      const onTaskCreated = (data: unknown) => appendTask(data as Task)
      const onTaskDeleted = (data: unknown) => removeTask((data as { taskId: string }).taskId)
      wsClient.on('task:status_changed', onStatusChanged)
      wsClient.on('task:created', onTaskCreated)
      wsClient.on('task:deleted', onTaskDeleted)
    }
    loadChildren()
  })

  const handleSelectChild = async (child: Child) => {
    setSelectedChild(child)
    setShowChildrenModal(false)
    await fetchTodayTasks(child.id)
    await fetchHabits(child.id)
    try {
      const ach = await achievementApi.getSummary(child.id)
      setChildAchievement(ach)
    } catch { /* ignore */ }
  }

  const handleGenerateInvite = async () => {
    if (!inviteChildNickname.trim()) {
      Taro.showToast({ title: '请输入孩子的昵称', icon: 'none' })
      return
    }
    setGeneratingInvite(true)
    try {
      const result = await authApi.generateInvite(inviteChildNickname.trim())
      setInviteCode(result.inviteCode)
      setInviteChildNickname('')
    } catch (e: unknown) {
      Taro.showToast({ title: (e as Error).message || '生成失败', icon: 'none' })
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleCopyInviteCode = () => {
    Taro.setClipboardData({ data: inviteCode })
      .then(() => Taro.showToast({ title: '邀请码已复制', icon: 'success' }))
      .catch(() => {/* ignore */})
  }

  const handleCloseInviteModal = () => {
    setShowInviteModal(false)
    setInviteCode('')
    setInviteChildNickname('')
    loadChildren()
  }

  const handleDescInput = (value: string) => {
    setDescInput(value)
    setDescError(false)

    // 清除旧的防抖定时器
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)

    if (!value.trim()) {
      setAiStatus('idle')
      return
    }

    // 800ms 防抖后自动触发 AI 解析
    aiTimerRef.current = setTimeout(async () => {
      setAiStatus('loading')
      try {
        const result = await aiApi.parseTask(value.trim())
        setForm((f) => ({
          ...f,
          title: value.trim().slice(0, 50),
          subject: result.subject,
          duration: String(result.duration),
          priority: String(result.priority),
        }))
        setAiStatus('success')
      } catch {
        // AI 失败：填入描述作为标题，保持当前学科/时长
        setForm((f) => ({ ...f, title: value.trim().slice(0, 50) }))
        setAiStatus('fallback')
      }
    }, 800)
  }

  const resetModal = () => {
    setDescInput('')
    setDescError(false)
    setAiStatus('idle')
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setForm(DEFAULT_FORM(selectedChild?.id ?? ''))
  }

  const handleAddTask = async () => {
    if (!form.title.trim() && !descInput.trim()) {
      setDescError(true)
      return
    }
    // 如果 title 还未填（AI 未完成），用 descInput 作为标题
    if (!form.title.trim()) {
      setForm((f) => ({ ...f, title: descInput.trim().slice(0, 50) }))
    }
    const duration = parseInt(form.duration, 10)
    if (isNaN(duration) || duration <= 0 || duration > 480) {
      Taro.showToast({ title: '时长应在1-480分钟', icon: 'none' })
      return
    }
    // childId 兜底：selectedChild 或 children[0]
    const childId = form.childId || selectedChild?.id || children[0]?.id || ''
    if (!childId) {
      Taro.showToast({ title: '请先选择孩子', icon: 'none' })
      return
    }
    const titleToSubmit = form.title.trim() || descInput.trim().slice(0, 50)
    setSubmitting(true)
    try {
      await createTask({
        childId,
        date: form.date,
        subject: form.subject,
        title: titleToSubmit,
        description: form.description.trim() || undefined,
        duration,
        priority: parseInt(form.priority, 10),
      })
      setShowAddModal(false)
      resetModal()
      Taro.showToast({ title: '任务创建成功', icon: 'success' })
    } catch (e: unknown) {
      Taro.showToast({ title: (e as Error).message || '创建失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = (task: Task) => {
    Taro.showModal({
      title: '删除任务',
      content: `确认删除「${task.title}」？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteTask(task.id)
            Taro.showToast({ title: '已删除', icon: 'success' })
          } catch (e: unknown) {
            Taro.showToast({ title: (e as Error).message, icon: 'none' })
          }
        }
      },
    })
  }

  const handleLogout = () => {
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
  }

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const doing = tasks.filter((t) => t.status === 'doing').length

  const getStatusClass = (status: Task['status']) => {
    if (status === 'doing') return styles.tagDoing
    if (status === 'done') return styles.tagDone
    return styles.tagTodo
  }

  const getStatusLabel = (status: Task['status']) => {
    if (status === 'doing') return '专注中'
    if (status === 'done') return '已完成'
    if (status === 'paused') return '已暂停'
    return '待完成'
  }

  return (
    <View className={styles.container}>
      {/* ===== 顶部 Header ===== */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>家长控制台</Text>
        <View
          className={styles.childSelector}
          onClick={() => children.length > 0 ? setShowChildrenModal(true) : setShowInviteModal(true)}
          data-testid='btn-select-child'
        >
          <Text className={styles.childSelectorAvatar}>
            {selectedChild ? '👧' : '👤'}
          </Text>
          <Text className={styles.childSelectorName}>
            {selectedChild ? selectedChild.nickname : (children.length > 0 ? '选择孩子' : '邀请孩子')}
          </Text>
          <Text className={styles.childSelectorArrow}>▾</Text>
        </View>
      </View>

      {/* ===== 快捷操作 ===== */}
      <View className={styles.quickActions}>
        <View
          className={styles.quickBtn}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/plan/index' })}
        >
          <Text className={styles.quickIcon}>📋</Text>
          <Text className={styles.quickText}>计划管理</Text>
        </View>
        <View
          className={styles.quickBtn}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/ranking/index' })}
        >
          <Text className={styles.quickIcon}>🏆</Text>
          <Text className={styles.quickText}>本周评比</Text>
        </View>
        <View
          className={styles.quickBtn}
          onClick={() => setShowInviteModal(true)}
          data-testid='btn-invite-child'
        >
          <Text className={styles.quickIcon}>➕</Text>
          <Text className={styles.quickText}>邀请孩子</Text>
        </View>
        <View
          className={styles.quickBtn}
          onClick={() => handleLogout()}
          data-testid='btn-logout'
        >
          <Text className={styles.quickIcon}>👤</Text>
          <Text className={styles.quickText}>退出</Text>
        </View>
      </View>

      {/* ===== 内容区 ===== */}
      <ScrollView scrollY className={styles.content}>
        {/* 孩子成就展示 */}
        {selectedChild && childAchievement && (
          <View className={styles.achievementBanner}>
            <Text className={styles.achievementBannerName}>{selectedChild.nickname}</Text>
            <View className={styles.achievementBannerStars}>
              <Text>⭐</Text>
              <Text data-testid='child-stars-display' className={styles.achievementBannerValue}>
                {childAchievement.stars}
              </Text>
              <Text>🌙</Text>
              <Text className={styles.achievementBannerValue}>{childAchievement.moons}</Text>
            </View>
          </View>
        )}

        {/* 今日任务 Section Card */}
        <View className={styles.sectionCard}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📚 今日任务</Text>
            <View className={styles.sectionMeta}>
              {total > 0 && (
                <Text className={styles.sectionCount}>{done}/{total} 已完成</Text>
              )}
              <View
                className={styles.sectionAction}
                onClick={() => {
                  setForm(DEFAULT_FORM(selectedChild?.id ?? children[0]?.id ?? ''))
                  resetModal()
                  setShowAddModal(true)
                }}
                data-testid='btn-add-task'
              >
                <Text className={styles.sectionActionText}>+ 添加</Text>
              </View>
            </View>
          </View>

          {isLoading ? (
            <View className={styles.skeletonList}>
              {[1, 2, 3].map((i) => (
                <View key={i} className={styles.skeletonItem} />
              ))}
            </View>
          ) : tasks.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📭</Text>
              <Text className={styles.emptyTitle}>
                {selectedChild ? '今日暂无任务' : '请先选择孩子'}
              </Text>
              {!selectedChild && (
                <Text className={styles.emptyDesc}>点击右上角选择或邀请孩子</Text>
              )}
            </View>
          ) : (
            <View data-testid='task-list' className={styles.taskList}>
              {tasks.map((task) => {
                const cfg = SUBJECT_CONFIG[task.subject] ?? SUBJECT_CONFIG['其他']
                const isActive = task.status === 'doing'
                const isDone = task.status === 'done'
                return (
                  <View
                    key={task.id}
                    data-testid={`task-item-${task.id}`}
                    className={[
                      styles.taskItem,
                      isActive ? styles.taskItemActive : '',
                      isDone ? styles.taskItemDone : '',
                    ].join(' ')}
                  >
                    <View className={[styles.taskIcon, cfg.bgClass].join(' ')}>
                      <Text className={styles.taskIconText}>{cfg.icon}</Text>
                    </View>
                    <View className={styles.taskInfo}>
                      <Text className={styles.taskName}>{task.title}</Text>
                      <Text className={styles.taskMeta}>
                        {task.subject} · <Text data-testid='task-duration'>{task.duration}</Text>分钟
                        {doing > 0 && isActive ? ' · ⏱️进行中' : ''}
                      </Text>
                    </View>
                    <Text className={[styles.taskStatusTag, getStatusClass(task.status)].join(' ')}>
                      {getStatusLabel(task.status)}
                    </Text>
                    {!isDone && (
                      <View className={styles.taskActions}>
                        <Text
                          className={styles.taskDeleteBtn}
                          onClick={() => handleDeleteTask(task)}
                        >🗑️</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* 习惯打卡 Section Card */}
        <View className={styles.sectionCard}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>☑️ 习惯打卡</Text>
            <Text
              className={styles.sectionAction}
              onClick={() => Taro.navigateTo({ url: '/pages/parent/plan/index?tab=habits' })}
            >管理 →</Text>
          </View>
          {habits.length === 0 ? (
            <View className={styles.placeholderState}>
              <Text className={styles.placeholderText}>🌱 暂无习惯，去管理页添加</Text>
            </View>
          ) : (
            <View className={styles.taskList}>
              {habits.map((habit) => (
                <View
                  key={habit.id}
                  className={styles.taskItem}
                  data-habit-id={habit.id}
                >
                  <Text className={styles.taskIconText}>{habit.icon}</Text>
                  <View className={styles.taskInfo}>
                    <Text className={styles.taskName}>{habit.name}</Text>
                    <Text className={styles.taskMeta}>
                      {habit.frequency === 'daily' ? '每天' : '每周'}
                    </Text>
                  </View>
                  {habit.checkedIn && (
                    <Text data-testid="habit-checked-icon">✅</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 今日奖励 Section Card */}
        {done > 0 && (
          <View className={styles.sectionCard}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>⭐ 今日奖励</Text>
            </View>
            <View className={styles.rewardRow}>
              <Text className={styles.rewardStars}>{'⭐'.repeat(Math.min(done, 5))}</Text>
              <View className={styles.rewardInfo}>
                <Text className={styles.rewardTitle}>已获得 {done} 颗星星</Text>
                <Text className={styles.rewardDesc}>完成 {total - done} 个任务可额外获得奖励</Text>
              </View>
            </View>
          </View>
        )}

        {/* 底部留白（给 FAB 腾空间） */}
        <View style={{ height: '160px' }} />
      </ScrollView>

      {/* ===== FAB 悬浮按钮 ===== */}
      {selectedChild && (
        <View
          className={styles.fab}
          onClick={() => {
            setForm(DEFAULT_FORM(selectedChild.id))
            resetModal()
            setShowAddModal(true)
          }}
          data-testid='fab-add-task'
        >
          <Text className={styles.fabIcon}>+</Text>
        </View>
      )}

      {/* ===== 底部导航栏 ===== */}
      <View className={styles.bottomNav}>
        <View className={[styles.navItem, styles.navItemActive].join(' ')}>
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
        <View
          className={styles.navItem}
          onClick={() => Taro.navigateTo({ url: '/pages/parent/ranking/index' })}
        >
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

      {/* ===== 邀请孩子弹窗 ===== */}
      {showInviteModal && (
        <View className={styles.modalOverlay}>
          <View className={styles.modal}>
            <Text className={styles.modalTitle}>邀请孩子加入</Text>
            {inviteCode ? (
              <View>
                <Text className={styles.modalLabel}>邀请码（发给孩子输入）</Text>
                <View className={styles.inviteCodeBox} onClick={handleCopyInviteCode} data-testid='invite-code-display'>
                  <Text className={styles.inviteCodeText}>{inviteCode}</Text>
                  <Text className={styles.inviteCodeHint}>点击复制</Text>
                </View>
                <Text className={styles.inviteCodeNote}>邀请码为一次性使用，孩子绑定后自动失效</Text>
                <View className={styles.modalActions}>
                  <View className={styles.btnPrimary} onClick={handleCloseInviteModal}>
                    <Text className={styles.btnPrimaryText}>完成</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text className={styles.modalLabel}>孩子昵称</Text>
                <Input
                  className={styles.modalInput}
                  placeholder='输入孩子的昵称'
                  value={inviteChildNickname}
                  onInput={(e) => setInviteChildNickname(e.detail.value)}
                  data-testid='input-invite-nickname'
                />
                <View className={styles.modalActions}>
                  <View className={styles.btnSecondary} onClick={handleCloseInviteModal}>
                    <Text className={styles.btnSecondaryText}>取消</Text>
                  </View>
                  <View
                    className={[styles.btnPrimary, generatingInvite ? styles.btnDisabled : ''].join(' ')}
                    onClick={generatingInvite ? undefined : handleGenerateInvite}
                    data-testid='btn-generate-invite'
                  >
                    <Text className={styles.btnPrimaryText}>
                      {generatingInvite ? '生成中...' : '生成邀请码'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== 选择孩子弹窗 ===== */}
      {showChildrenModal && (
        <View className={styles.modalOverlay}>
          <View className={styles.modal}>
            <Text className={styles.modalTitle}>选择孩子</Text>
            {children.map((child) => (
              <View
                key={child.id}
                className={[styles.childItem, selectedChild?.id === child.id ? styles.childItemActive : ''].join(' ')}
                onClick={() => handleSelectChild(child)}
                data-testid='child-item'
              >
                <Text className={styles.childItemAvatar}>👧</Text>
                <Text className={styles.childItemName}>{child.nickname}</Text>
                {selectedChild?.id === child.id && <Text className={styles.childItemCheck}>✓</Text>}
              </View>
            ))}
            <View className={styles.modalActions}>
              <View className={styles.btnSecondary} onClick={() => setShowChildrenModal(false)}>
                <Text className={styles.btnSecondaryText}>取消</Text>
              </View>
              <View className={styles.btnPrimary} onClick={() => { setShowChildrenModal(false); setShowInviteModal(true) }}>
                <Text className={styles.btnPrimaryText}>+ 再邀请</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 添加任务弹窗 ===== */}
      {showAddModal && (
        <View className={styles.modalOverlay}>
          <View data-testid='quick-add-task-modal' className={styles.modal}>
            <Text className={styles.modalTitle}>添加任务</Text>

            {/* AI 描述输入区 */}
            <Text className={styles.modalLabel}>用自然语言描述任务</Text>
            <Input
              data-testid='input-task-desc'
              className={[styles.modalInput, descError ? styles.inputError : ''].join(' ')}
              placeholder='例如：做30分钟数学口算'
              value={descInput}
              maxlength={100}
              onInput={(e) => handleDescInput(e.detail.value)}
            />
            {descError && (
              <Text data-testid='task-desc-error' className={styles.errorText}>请输入任务描述</Text>
            )}
            {descInput.length >= 90 && (
              <Text data-testid='task-desc-length-warning' className={styles.warnText}>
                {descInput.length}/100
              </Text>
            )}

            {/* AI 识别结果 */}
            {aiStatus === 'loading' && (
              <View className={styles.aiLoading}>
                <Text className={styles.aiLoadingText}>⏳ AI识别中...</Text>
              </View>
            )}
            {aiStatus === 'success' && (
              <View data-testid='ai-parse-result' className={styles.aiResult}>
                <Text className={styles.aiResultLabel}>AI识别：</Text>
                <Text data-testid='ai-subject-tag' className={styles.aiSubjectTag}>{form.subject}</Text>
                <Text data-testid='ai-estimated-duration' className={styles.aiDuration}>{form.duration}分钟</Text>
              </View>
            )}
            {aiStatus === 'fallback' && (
              <View data-testid='ai-parse-fallback' className={styles.aiFallback}>
                <Text className={styles.aiFallbackText}>AI识别失败，请手动选择学科和时长</Text>
              </View>
            )}

            {/* 科目 */}
            <Text className={styles.modalLabel}>科目</Text>
            <View className={styles.tagRow}>
              {SUBJECTS.map((s) => (
                <View
                  key={s}
                  data-testid={`subject-option-${s}`}
                  className={[styles.tag, form.subject === s ? styles.tagActive : ''].join(' ')}
                  onClick={() => setForm((f) => ({ ...f, subject: s }))}
                >
                  <Text className={[styles.tagText, form.subject === s ? styles.tagTextActive : ''].join(' ')}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>

            {/* 时长 */}
            <Text className={styles.modalLabel}>时长（分钟）</Text>
            <Input
              data-testid='input-task-duration'
              className={styles.modalInput}
              type='number'
              placeholder='输入分钟数（1-480）'
              value={form.duration}
              onInput={(e) => setForm((f) => ({ ...f, duration: e.detail.value }))}
            />

            {/* 优先级 */}
            <Text className={styles.modalLabel}>优先级</Text>
            <View className={styles.tagRow}>
              {[{ v: '1', l: '🔴 高' }, { v: '2', l: '🟡 中' }, { v: '3', l: '🟢 低' }].map(({ v, l }) => (
                <View
                  key={v}
                  className={[styles.tag, form.priority === v ? styles.tagActive : ''].join(' ')}
                  onClick={() => setForm((f) => ({ ...f, priority: v }))}
                >
                  <Text className={[styles.tagText, form.priority === v ? styles.tagTextActive : ''].join(' ')}>
                    {l}
                  </Text>
                </View>
              ))}
            </View>

            <View className={styles.modalActions}>
              <View className={styles.btnSecondary} onClick={() => { setShowAddModal(false); resetModal() }}>
                <Text className={styles.btnSecondaryText}>取消</Text>
              </View>
              <View
                data-testid='btn-confirm-add-task'
                className={[styles.btnPrimary, submitting ? styles.btnDisabled : ''].join(' ')}
                onClick={submitting ? undefined : handleAddTask}
              >
                <Text className={styles.btnPrimaryText}>
                  {submitting ? '提交中...' : '确认添加'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
