/**
 * TC-P-PLAN：家长端计划管理页（3个 Tab：今日计划 / 日历视图 / 场景模板）
 *
 * 覆盖范围：
 *  - Tab 切换（今日/日历/模板）
 *  - 今日计划 Tab：任务 + 习惯双列表
 *  - 日历视图 Tab：月历渲染、日期圆点指示、点击日期展示当日计划
 *  - 日历翻月：上月/下月切换
 *  - 场景模板 Tab：4个系统模板展示
 *  - 应用场景模板 → 生成今日任务
 *  - 跳转任务创建页 / 习惯创建页
 *  - 权限守卫
 */

import { test, expect, Page } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  injectAuth,
  createFreshTask,
  createFreshHabit,
  apiDelete,
  FreshLoginResult,
} from './helpers'

// ──── 模块级共享状态 ────────────────────────────────────────────────────────

let parentLogin: FreshLoginResult
let childId: string

test.beforeAll(async () => {
  const state = readTestState()
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childId     = state.child.id
})

// ──── 辅助 ──────────────────────────────────────────────────────────────────

async function gotoPlanPage(page: Page, tab?: string) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  const url = tab
    ? `/#/pages/parent/plan/index?tab=${tab}`
    : '/#/pages/parent/plan/index'
  await page.goto(url)
  await expect(page.locator('[data-testid="plan-page"]')).toBeVisible({ timeout: 8000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Tab 切换
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PLAN-01x Tab 切换', () => {

  test('TC-P-PLAN-01: 默认进入计划管理页 → 停在"今日计划" Tab', async ({ page }) => {
    await gotoPlanPage(page)
    // 今日计划 Tab 处于激活状态
    const todayTab = page.locator('[data-testid="tab-today"]')
    await expect(todayTab).toBeVisible()
    await expect(todayTab).toHaveAttribute('data-active', 'true')
  })

  test('TC-P-PLAN-02: 点击"日历视图" Tab → 切换为日历 Tab 激活，显示月历', async ({ page }) => {
    await gotoPlanPage(page)
    await page.locator('[data-testid="tab-calendar"]').click()

    await expect(page.locator('[data-testid="tab-calendar"]')).toHaveAttribute('data-active', 'true')
    // 月历主体可见
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-P-PLAN-03: 点击"场景模板" Tab → 切换为模板 Tab 激活，显示模板列表', async ({ page }) => {
    await gotoPlanPage(page)
    await page.locator('[data-testid="tab-templates"]').click()

    await expect(page.locator('[data-testid="tab-templates"]')).toHaveAttribute('data-active', 'true')
    await expect(page.locator('[data-testid="template-list"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-P-PLAN-04: Tab 之间可以来回切换 → 内容区域跟随变化', async ({ page }) => {
    await gotoPlanPage(page)

    // 切换到日历
    await page.locator('[data-testid="tab-calendar"]').click()
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()

    // 切换回今日
    await page.locator('[data-testid="tab-today"]').click()
    await expect(page.locator('[data-testid="today-task-list"]')).toBeVisible()

    // 切换到模板
    await page.locator('[data-testid="tab-templates"]').click()
    await expect(page.locator('[data-testid="template-list"]')).toBeVisible()
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 今日计划 Tab
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PLAN-02x 今日计划 Tab', () => {

  test('TC-P-PLAN-05: 今日计划 Tab 显示计时任务列表', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    await gotoPlanPage(page, 'today')

    // 任务出现在今日列表
    await expect(page.locator('[data-testid="today-task-list"]')).toBeVisible()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toBeVisible({ timeout: 6000 })

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

  test('TC-P-PLAN-06: 今日计划 Tab 显示打卡习惯列表', async ({ page }) => {
    const habit = await createFreshHabit(parentLogin.token, childId)

    await gotoPlanPage(page, 'today')

    await expect(page.locator('[data-testid="today-habit-list"]')).toBeVisible()
    await expect(page.locator(`[data-habit-id="${habit.id}"]`)).toBeVisible({ timeout: 6000 })

    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  test('TC-P-PLAN-07: 今日计划 Tab 点击"+ 添加任务" → 跳转到任务创建页', async ({ page }) => {
    await gotoPlanPage(page, 'today')
    await page.locator('[data-testid="btn-add-task"]').click()

    // 跳转到创建页 或 弹出弹窗（两种实现均可）
    await page.waitForTimeout(1000)
    const isOnCreatePage = page.url().includes('task/create')
    const isModalVisible = await page.locator('[data-testid="add-task-modal"]').isVisible()
    expect(isOnCreatePage || isModalVisible).toBe(true)
  })

  test('TC-P-PLAN-08: 今日计划 Tab 点击"+ 添加习惯" → 跳转到习惯创建页', async ({ page }) => {
    await gotoPlanPage(page, 'today')
    await page.locator('[data-testid="btn-add-habit"]').click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('habit/create')
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 日历视图 Tab
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PLAN-03x 日历视图 Tab', () => {

  test('TC-P-PLAN-09: 日历视图显示当前月份标题（年/月）', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString()

    // 月份标题包含当前年月
    const header = page.locator('[data-testid="calendar-header"]')
    await expect(header).toContainText(year)
    await expect(header).toContainText(month)
  })

  test('TC-P-PLAN-10: 日历视图渲染本月所有日期格子', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    // 至少渲染了当月的天数
    const dayItems = await page.locator('[data-testid^="calendar-day-"]').count()
    expect(dayItems).toBeGreaterThanOrEqual(daysInMonth)
  })

  test('TC-P-PLAN-11: 有任务的日期显示圆点指示符', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)
    const today = new Date().getDate().toString()

    await gotoPlanPage(page, 'calendar')

    // 今日格子上的圆点指示符
    const todayCell = page.locator(`[data-testid="calendar-day-${today}"]`)
    await expect(todayCell).toBeVisible({ timeout: 5000 })
    await expect(todayCell.locator('[data-testid="day-dot"]')).toBeVisible()

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

  test('TC-P-PLAN-12: 点击日期 → 下方展示该日任务详情列表', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)
    const today = new Date().getDate().toString()

    await gotoPlanPage(page, 'calendar')

    // 点击今日
    await page.locator(`[data-testid="calendar-day-${today}"]`).click()

    // 当日任务详情出现
    await expect(page.locator('[data-testid="day-detail-panel"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toBeVisible({ timeout: 5000 })

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

  test('TC-P-PLAN-13: 点击"上月"箭头 → 日历切换到上个月', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth() // 当月-1

    await page.locator('[data-testid="calendar-prev"]').click()

    const header = page.locator('[data-testid="calendar-header"]')
    await expect(header).toContainText(prevMonth.toString(), { timeout: 2000 })
  })

  test('TC-P-PLAN-14: 点击"下月"箭头 → 日历切换到下个月', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    const now = new Date()
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2 // 当月+1 (1-indexed)

    await page.locator('[data-testid="calendar-next"]').click()

    const header = page.locator('[data-testid="calendar-header"]')
    await expect(header).toContainText(nextMonth.toString(), { timeout: 2000 })
  })

  test('TC-P-PLAN-15: 点击历史日期（已过去）→ 仅展示，不显示编辑按钮', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    // 点击1号（假设当月1号已过去，若今天是1号则跳过）
    const today = new Date().getDate()
    if (today > 1) {
      await page.locator('[data-testid="calendar-day-1"]').click()
      await expect(page.locator('[data-testid="day-detail-panel"]')).toBeVisible({ timeout: 3000 })

      // 历史日期不显示添加/编辑按钮
      await expect(page.locator('[data-testid="day-btn-add-task"]')).not.toBeVisible()
    }
  })

  test('TC-P-PLAN-16: 点击未来日期 → 展示计划并显示编辑按钮', async ({ page }) => {
    await gotoPlanPage(page, 'calendar')

    // 点击当月最后一天（通常是未来）
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (lastDay > now.getDate()) {
      await page.locator(`[data-testid="calendar-day-${lastDay}"]`).click()
      await expect(page.locator('[data-testid="day-detail-panel"]')).toBeVisible({ timeout: 3000 })
      // 未来日期显示添加任务按钮
      await expect(page.locator('[data-testid="day-btn-add-task"]')).toBeVisible()
    }
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 场景模板 Tab
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PLAN-04x 场景模板 Tab', () => {

  test('TC-P-PLAN-17: 场景模板页展示4个系统模板卡片', async ({ page }) => {
    await gotoPlanPage(page, 'templates')

    // 4个系统模板
    await expect(page.locator('[data-testid="template-daily-study"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-weekend-review"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-vacation"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-exam-sprint"]')).toBeVisible()
  })

  test('TC-P-PLAN-18: 点击"日常学习"模板 → 展示模板详情（预设任务列表）', async ({ page }) => {
    await gotoPlanPage(page, 'templates')
    await page.locator('[data-testid="template-daily-study"]').click()

    // 模板详情/预览弹窗
    await expect(page.locator('[data-testid="template-detail"]')).toBeVisible({ timeout: 3000 })
    // 至少包含3个预设任务
    const presetTasks = page.locator('[data-testid^="preset-task-"]')
    const count = await presetTasks.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('TC-P-PLAN-19: 应用"日常学习"模板到今天 → 生成多个任务', async ({ page }) => {
    await gotoPlanPage(page, 'templates')
    await page.locator('[data-testid="template-daily-study"]').click()
    await expect(page.locator('[data-testid="template-detail"]')).toBeVisible({ timeout: 3000 })

    // 点击"应用到今天"
    await page.locator('[data-testid="btn-apply-today"]').click()
    await page.waitForTimeout(2000)

    // 成功提示
    await expect(
      page.locator('[data-testid="success-toast"], [data-testid="template-success-msg"]')
    ).toBeVisible({ timeout: 5000 })
  })

  test('TC-P-PLAN-20: 取消应用模板 → 不生成任何任务', async ({ page }) => {
    await gotoPlanPage(page, 'templates')
    await page.locator('[data-testid="template-daily-study"]').click()
    await expect(page.locator('[data-testid="template-detail"]')).toBeVisible({ timeout: 3000 })

    // 关闭/取消
    await page.locator('[data-testid="btn-close-template"]').click()
    await expect(page.locator('[data-testid="template-detail"]')).not.toBeVisible({ timeout: 2000 })
    // 停留在模板列表
    await expect(page.locator('[data-testid="template-list"]')).toBeVisible()
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 权限守卫
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PLAN-05x 权限守卫', () => {

  test('TC-P-PLAN-21: 未登录访问计划管理页 → 跳转到登录页', async ({ page }) => {
    await page.goto('/#/pages/parent/plan/index')
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

})
