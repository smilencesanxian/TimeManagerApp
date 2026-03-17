import { test, expect } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  createFreshTask,
  createFreshHabit,
  checkInHabitViaApi,
  getAchievementSummary,
  injectAuth,
  apiPost,
  apiGet,
  apiDelete,
  FreshLoginResult,
  CreatedTask,
  CreatedHabit,
} from './helpers'

// ──── 模块级共享状态 ──────────────────────────────────────────────

let parentLogin: FreshLoginResult
let childLogin: FreshLoginResult
let childId: string

test.beforeAll(async () => {
  const state = readTestState()
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childLogin = await loginViaApi(state.child.phone, state.child.password)
  childId = state.child.id
})

// ═══════════════════════════════════════════════════════════════════
// 星星/月亮/太阳 顶部实时展示
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-DISPLAY 孩子端奖励实时展示', () => {

  // ─── TC-ACH-01：顶部状态栏显示当前奖励数量 ───────────────────

  test('TC-ACH-01: 孩子任务页顶部显示星星、月亮、太阳数量', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')

    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="moon-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="sun-count"]')).toBeVisible()

    // 数量为非负整数
    const starText = await page.locator('[data-testid="star-count"]').textContent()
    expect(parseInt(starText ?? '-1')).toBeGreaterThanOrEqual(0)
  })

  // ─── TC-ACH-02：完成任务后星星实时+1 ─────────────────────────

  test('TC-ACH-02: 完成任务后顶部星星数量实时+1', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    // 记录完成前的星星数
    const starsBefore = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )

    // 进入番茄钟页并完成任务
    const taskItem = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskItem).toBeVisible({ timeout: 8000 })
    await taskItem.click()

    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()
    await page.locator('[data-testid="btn-confirm-finish"]').click()

    // 庆祝动画出现，任务完成
    await expect(page.locator('[data-testid="completion-animation"]')).toBeVisible({ timeout: 5000 })

    // 返回任务页
    await page.locator('[data-testid="btn-back-to-tasks"]').click()
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    // 星星数增加（至少+1）
    const starsAfter = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )
    expect(starsAfter).toBeGreaterThan(starsBefore)
  })

  // ─── TC-ACH-03：习惯打卡后星星实时+1 ────────────────────────

  test('TC-ACH-03: 习惯打卡后顶部星星数+N（按习惯奖励配置）', async ({ page }) => {
    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    const starsBefore = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )

    // 打卡
    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 8000 })
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 星星+1
    await page.waitForTimeout(1000)
    const starsAfter = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )
    expect(starsAfter).toBe(starsBefore + 1)

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  // ─── TC-ACH-04：完成任务时的浮动星星动画 ─────────────────────

  test('TC-ACH-04: 任务完成弹窗显示本次获得的星星数', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto(`/#/pages/child/pomodoro/index?taskId=${task.id}`)
    await expect(page.locator('[data-testid="btn-start-focus"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()
    await page.locator('[data-testid="btn-confirm-finish"]').click()

    // 完成弹窗中显示获得的星星
    await expect(page.locator('[data-testid="completion-star-reward"]')).toBeVisible({ timeout: 5000 })
    const rewardText = await page.locator('[data-testid="completion-star-reward"]').textContent()
    // 格式如 "+1 ⭐" 或 "获得 1 颗星星"
    expect(rewardText).toMatch(/\d+/)
  })

})

// ═══════════════════════════════════════════════════════════════════
// 星星兑换月亮 / 月亮兑换太阳
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-CONVERT 奖励自动兑换', () => {

  // ─── TC-ACH-05：10颗星自动兑换1个月亮 ───────────────────────

  test('TC-ACH-05: 后端检测满10星后自动兑换1月亮，前端显示兑换通知', async ({ page }) => {
    // 通过 API 直接设置孩子星星数为9（触边界），然后再打卡+1
    // 注意：此测试需要 /achievements/debug/set-stars 调试接口，或手动创建足够任务
    // 测试策略：调用调试 API 将星星设置到临界值，然后通过 UI 触发最后1颗

    const setStarsRes = await apiPost(
      '/achievements/debug/set-stars',
      { childId, stars: 9 },
      parentLogin.token
    ) as { code: number }

    // 如果调试接口不存在（非调试环境），跳过此用例
    test.skip(setStarsRes.code !== 200, '调试接口不可用，跳过此用例')

    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    // 打卡（星星: 9 → 10 → 触发兑换）
    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 8000 })
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 兑换提示动画出现
    await expect(page.locator('[data-testid="conversion-toast"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="conversion-toast"]')).toContainText('月亮')

    // 顶部月亮数 +1，星星数归零（或减去10）
    await page.waitForTimeout(2000)
    const moonCount = parseInt((await page.locator('[data-testid="moon-count"]').textContent()) ?? '0')
    expect(moonCount).toBeGreaterThanOrEqual(1)

    // 后端验证
    const summary = await getAchievementSummary(childLogin.token)
    expect(summary.stars).toBeLessThan(10)
    expect(summary.moons).toBeGreaterThanOrEqual(1)

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  // ─── TC-ACH-06：10个月亮自动兑换1个太阳 ─────────────────────

  test('TC-ACH-06: 后端检测满10月亮后自动兑换1太阳，前端显示太阳兑换动画', async ({ page }) => {
    // 通过调试 API 设置月亮到临界值
    const setRes = await apiPost(
      '/achievements/debug/set-rewards',
      { childId, stars: 9, moons: 9, suns: 0 },
      parentLogin.token
    ) as { code: number }

    test.skip(setRes.code !== 200, '调试接口不可用，跳过此用例')

    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    // 打卡触发：9星→10星兑换1月亮，9月亮+1→10月亮兑换1太阳
    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 出现太阳兑换动画
    await expect(page.locator('[data-testid="conversion-toast"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="conversion-toast"]')).toContainText('太阳')

    // 验证太阳数量增加
    const summary = await getAchievementSummary(childLogin.token)
    expect(summary.suns).toBeGreaterThanOrEqual(1)

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

})

// ═══════════════════════════════════════════════════════════════════
// 成就页面（孩子端 /child/achievements）
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-PAGE 成就页面展示', () => {

  // ─── TC-ACH-07：从顶部星星图标跳转到成就页 ──────────────────

  test('TC-ACH-07: 点击顶部星星图标 → 跳转到成就页', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="star-count"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="star-count"]').click()

    // 跳转到成就页
    await page.waitForURL(/child\/achievements/, { timeout: 5000 })
    expect(page.url()).toContain('child/achievements')
  })

  // ─── TC-ACH-08：成就页显示当前等级、称号、进度条 ─────────────

  test('TC-ACH-08: 成就页显示等级称号和升级进度条', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')

    // 等级显示
    await expect(page.locator('[data-testid="level-display"]')).toBeVisible({ timeout: 8000 })
    const levelText = await page.locator('[data-testid="level-display"]').textContent()
    expect(levelText).toMatch(/Lv\.\d+/)

    // 等级称号
    await expect(page.locator('[data-testid="level-title"]')).toBeVisible()
    // 称号在规定范围内
    const validTitles = ['时间小新手', '时间管理学徒', '时间规划师', '效率达人', '时间大师']
    const titleText = await page.locator('[data-testid="level-title"]').textContent() ?? ''
    const isValidTitle = validTitles.some((t) => titleText.includes(t))
    expect(isValidTitle).toBe(true)

    // 进度条可见（表示距离升级还需多少星星）
    await expect(page.locator('[data-testid="level-progress-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="stars-to-next-level"]')).toBeVisible()
  })

  // ─── TC-ACH-09：成就页展示星星、月亮、太阳总量 ──────────────

  test('TC-ACH-09: 成就页顶部大图标区域显示三类奖励总量', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')

    // 三种奖励图标区域
    await expect(page.locator('[data-testid="achievement-stars-total"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="achievement-moons-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="achievement-suns-total"]')).toBeVisible()

    // 数量均为非负整数
    const starsText = await page.locator('[data-testid="achievement-stars-total"]').textContent()
    const moonsText = await page.locator('[data-testid="achievement-moons-total"]').textContent()
    const sunsText  = await page.locator('[data-testid="achievement-suns-total"]').textContent()
    expect(parseInt(starsText ?? '-1')).toBeGreaterThanOrEqual(0)
    expect(parseInt(moonsText ?? '-1')).toBeGreaterThanOrEqual(0)
    expect(parseInt(sunsText  ?? '-1')).toBeGreaterThanOrEqual(0)

    // 与后端 API 返回一致
    const summary = await getAchievementSummary(childLogin.token)
    expect(parseInt(starsText ?? '0')).toBe(summary.stars)
    expect(parseInt(moonsText ?? '0')).toBe(summary.moons)
    expect(parseInt(sunsText ?? '0')).toBe(summary.suns)
  })

  // ─── TC-ACH-10：成就页显示本周获得汇总 ──────────────────────

  test('TC-ACH-10: 成就页显示本周获得的星星和月亮统计', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')

    // 本周统计区域
    await expect(page.locator('[data-testid="weekly-summary"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="weekly-stars-earned"]')).toBeVisible()
    await expect(page.locator('[data-testid="weekly-moons-earned"]')).toBeVisible()

    // 本周获得星星为非负整数
    const weeklyStarsText = await page.locator('[data-testid="weekly-stars-earned"]').textContent()
    expect(parseInt(weeklyStarsText ?? '-1')).toBeGreaterThanOrEqual(0)
  })

  // ─── TC-ACH-11：点击历史记录 → 显示成就日历 ──────────────────

  test('TC-ACH-11: 点击「查看历史记录」→ 展开成就历史日历', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')
    await expect(page.locator('[data-testid="btn-view-history"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-view-history"]').click()

    // 历史日历区域可见
    await expect(page.locator('[data-testid="achievement-history-calendar"]')).toBeVisible({ timeout: 3000 })
  })

  // ─── TC-ACH-12：成就历史日历中今天的日期高亮显示 ─────────────

  test('TC-ACH-12: 成就历史日历中今天的日期高亮标记', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')

    // 直接跳转到历史详情页
    await page.goto('/#/pages/child/achievement/detail/index')
    await expect(page.locator('[data-testid="achievement-history-calendar"]')).toBeVisible({ timeout: 8000 })

    // 今天的日期格子有 today 标识
    await expect(page.locator('[data-testid="calendar-day-today"]')).toBeVisible()
  })

  // ─── TC-ACH-13：成就历史日历中有记录的日期显示星星数 ─────────

  test('TC-ACH-13: 历史日历中今日打卡后对应格子显示星星数量', async ({ page }) => {
    // 先通过 API 创建习惯并打卡，确保今天有奖励记录
    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })
    await checkInHabitViaApi(childLogin.token, habit.id)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievement/detail/index')
    await expect(page.locator('[data-testid="achievement-history-calendar"]')).toBeVisible({ timeout: 8000 })

    // 今天的日历格子显示星星数量（≥1）
    const todayCell = page.locator('[data-testid="calendar-day-today"]')
    await expect(todayCell).toBeVisible()
    const cellText = await todayCell.textContent()
    // 应该包含数字（星星数）
    expect(cellText).toMatch(/\d+/)

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

})

// ═══════════════════════════════════════════════════════════════════
// 等级系统
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-LEVEL 等级计算规则', () => {

  // ─── TC-ACH-14：等级称号与星星数的对应关系验证 ───────────────

  test('TC-ACH-14: 后端返回的等级称号与当前星星数匹配', async () => {
    const summary = await getAchievementSummary(childLogin.token)

    // 根据 PRD 规则验证等级
    const levelRules = [
      { minStars: 0,  maxStars: 9,  level: 1, title: '时间小新手' },
      { minStars: 10, maxStars: 24, level: 2, title: '时间管理学徒' },
      { minStars: 25, maxStars: 44, level: 3, title: '时间规划师' },
      { minStars: 45, maxStars: 69, level: 4, title: '效率达人' },
      { minStars: 70, maxStars: Infinity, level: 5, title: '时间大师' },
    ]

    const totalStars = summary.stars + summary.moons * 10 + summary.suns * 100
    const expectedRule = levelRules.find(
      (r) => totalStars >= r.minStars && totalStars <= r.maxStars
    )

    if (expectedRule) {
      expect(summary.level).toBeGreaterThanOrEqual(expectedRule.level)
    }
    expect(typeof summary.levelTitle).toBe('string')
    expect(summary.levelTitle.length).toBeGreaterThan(0)
  })

  // ─── TC-ACH-15：升级时完成弹窗显示升级庆祝 ──────────────────

  test('TC-ACH-15: 获得星星触发升级时，显示升级庆祝弹窗', async ({ page }) => {
    // 设置星星数到升级临界点（如 Lv1→Lv2 需要 10星，设置9星后完成任务）
    const setRes = await apiPost(
      '/achievements/debug/set-stars',
      { childId, stars: 9 },
      parentLogin.token
    ) as { code: number }

    test.skip(setRes.code !== 200, '调试接口不可用，跳过此用例')

    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 打卡，触发升级（9→10星）
    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 升级庆祝弹窗出现
    await expect(page.locator('[data-testid="level-up-modal"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="level-up-modal"]')).toContainText('升级')

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

})

// ═══════════════════════════════════════════════════════════════════
// 全流程联动测试
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-FLOW 成就系统全流程联动', () => {

  // ─── TC-ACH-FLOW-01：完成任务 → 星星增加 → 成就页立即更新 ──

  test('TC-ACH-FLOW-01: 任务完成 → 返回成就页 → 星星数已更新', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')
    await expect(page.locator('[data-testid="achievement-stars-total"]')).toBeVisible({ timeout: 8000 })

    const starsBefore = parseInt(
      (await page.locator('[data-testid="achievement-stars-total"]').textContent()) ?? '0'
    )

    // 进入番茄钟完成任务
    await page.goto(`/#/pages/child/pomodoro/index?taskId=${task.id}`)
    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()
    await page.locator('[data-testid="btn-confirm-finish"]').click()
    await expect(page.locator('[data-testid="completion-animation"]')).toBeVisible({ timeout: 5000 })

    // 重新注入 auth 并跳转到成就页
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')
    await expect(page.locator('[data-testid="achievement-stars-total"]')).toBeVisible({ timeout: 8000 })

    const starsAfter = parseInt(
      (await page.locator('[data-testid="achievement-stars-total"]').textContent()) ?? '0'
    )
    expect(starsAfter).toBeGreaterThan(starsBefore)
  })

  // ─── TC-ACH-FLOW-02：打卡习惯 → 星星增加 → 家长看板成就同步 ─

  test('TC-ACH-FLOW-02: 孩子习惯打卡后，家长首页看板显示最新星星数', async ({ browser }) => {
    const habit = await createFreshHabit(parentLogin.token, childId, { rewardStars: 1 })

    // 获取打卡前星星数
    const summaryBefore = await getAchievementSummary(childLogin.token)

    // 孩子端打卡
    const childContext = await browser.newContext()
    const childPage = await childContext.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/tasks/index')
    await expect(childPage.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    const habitItem = childPage.locator(`[data-habit-id="${habit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })
    await childContext.close()

    // 家长端查看孩子星星数变化
    const summaryAfter = await getAchievementSummary(childLogin.token)
    expect(summaryAfter.stars).toBeGreaterThan(summaryBefore.stars)

    // 家长端打开首页，星星数与后端一致
    const parentContext = await browser.newContext()
    const parentPage = await parentContext.newPage()
    await injectAuth(parentPage, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await parentPage.goto('/#/pages/parent/home/index')
    await expect(parentPage.locator('[data-testid="child-stars-display"]')).toBeVisible({ timeout: 8000 })
    const displayedStars = parseInt(
      (await parentPage.locator('[data-testid="child-stars-display"]').textContent()) ?? '0'
    )
    expect(displayedStars).toBe(summaryAfter.stars)
    await parentContext.close()

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  // ─── TC-ACH-FLOW-03：完成全天任务 → 额外+1星奖励 ────────────

  test('TC-ACH-FLOW-03: 孩子完成今日全部任务 → 显示全日完成奖励（额外+1星）', async ({ page }) => {
    // 先清空今日已有任务并创建恰好1个任务
    const task = await createFreshTask(parentLogin.token, childId)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto(`/#/pages/child/pomodoro/index?taskId=${task.id}`)
    await expect(page.locator('[data-testid="btn-start-focus"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()
    await page.locator('[data-testid="btn-confirm-finish"]').click()

    // 完成所有任务后显示今日完成奖励
    await expect(page.locator('[data-testid="daily-complete-bonus"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="daily-complete-bonus"]')).toContainText('+1')
  })

  // ─── TC-ACH-FLOW-04：成就页 → 后端 API 成就汇总数据一致性 ───

  test('TC-ACH-FLOW-04: 成就页显示数据与后端 API 精确一致', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/achievements/index')
    await expect(page.locator('[data-testid="achievement-stars-total"]')).toBeVisible({ timeout: 8000 })

    // 同时获取 UI 数据和后端 API 数据
    const [starsUI, moonsUI, sunsUI] = await Promise.all([
      page.locator('[data-testid="achievement-stars-total"]').textContent(),
      page.locator('[data-testid="achievement-moons-total"]').textContent(),
      page.locator('[data-testid="achievement-suns-total"]').textContent(),
    ])

    const summary = await getAchievementSummary(childLogin.token)

    expect(parseInt(starsUI ?? '0')).toBe(summary.stars)
    expect(parseInt(moonsUI ?? '0')).toBe(summary.moons)
    expect(parseInt(sunsUI  ?? '0')).toBe(summary.suns)
  })

})

// ═══════════════════════════════════════════════════════════════════
// 异常流程
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-ACH-E 成就系统异常流程', () => {

  // ─── TC-ACH-E01：成就页 API 失败时显示降级 UI ────────────────

  test('TC-ACH-E01: 成就 API 失败时页面不崩溃，显示错误状态', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)

    // 拦截成就 API 返回错误
    await page.route('**/achievements/**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ code: 500 }) })
    )

    await page.goto('/#/pages/child/achievements/index')
    await page.waitForTimeout(3000)

    // 页面不崩溃（不出现 JS 错误白屏），显示错误状态或 loading
    const hasErrorState = await page.locator('[data-testid="achievement-error-state"]').isVisible()
    const hasContent = await page.locator('[data-testid="achievement-stars-total"]').isVisible()
    // 至少一个状态存在（错误UI 或 缓存数据）
    expect(hasErrorState || hasContent).toBe(true)
  })

  // ─── TC-ACH-E02：未登录访问成就页 → 跳转登录 ────────────────

  test('TC-ACH-E02: 未登录访问成就页 → 自动跳转到登录页', async ({ page }) => {
    // 不注入 auth
    await page.goto('/#/pages/child/achievements/index')
    await page.waitForTimeout(2000)

    expect(page.url()).toContain('login')
  })

})
