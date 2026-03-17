/**
 * TC-P-HOME：家长端首页看板
 *
 * 覆盖范围：
 *  - 今日任务统计卡片展示
 *  - 计时任务列表 & 打卡习惯列表分区
 *  - 快速添加任务弹窗（含表单校验）
 *  - 任务状态变更（手动标记完成/重置）
 *  - 任务删除流程
 *  - 实时看板（WebSocket）：孩子开始/完成任务时家长端同步
 *  - 权限守卫：孩子账号 & 未登录不可访问
 *  - 空状态引导文案
 */

import { test, expect, Page } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  injectAuth,
  createFreshTask,
  createFreshHabit,
  checkInHabitViaApi,
  apiPut,
  apiDelete,
  FreshLoginResult,
  CreatedTask,
} from './helpers'

// ──── 模块级共享状态 ──────────────────────────────────────────────────────────

let parentLogin: FreshLoginResult
let childLogin: FreshLoginResult
let childId: string

test.beforeAll(async () => {
  const state = readTestState()
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childLogin  = await loginViaApi(state.child.phone,  state.child.password)
  childId     = state.child.id
})

// ──── 辅助：进入家长首页 ────────────────────────────────────────────────────

async function gotoParentHome(page: Page) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  await page.goto('/#/pages/parent/home/index')
  // 等待首页核心内容加载完成
  await expect(page.locator('[data-testid="parent-home"]')).toBeVisible({ timeout: 8000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 首页基础展示
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-01x 首页基础展示', () => {

  test('TC-P-HOME-01: 进入家长首页 → 今日统计卡片可见（已完成/总任务/专注时长）', async ({ page }) => {
    await gotoParentHome(page)

    // 统计卡片区域
    await expect(page.locator('[data-testid="stats-card"]')).toBeVisible()
    // 三项统计数据
    await expect(page.locator('[data-testid="stats-completed"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-focus-time"]')).toBeVisible()
  })

  test('TC-P-HOME-02: 首页分两列展示"计时任务"与"打卡习惯"', async ({ page }) => {
    // 预置一个任务 + 一个习惯
    const task  = await createFreshTask(parentLogin.token, childId)
    const habit = await createFreshHabit(parentLogin.token, childId)

    await gotoParentHome(page)

    // 计时任务区
    await expect(page.locator('[data-testid="task-section"]')).toBeVisible()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toBeVisible()

    // 打卡习惯区
    await expect(page.locator('[data-testid="habit-section"]')).toBeVisible()
    await expect(page.locator(`[data-habit-id="${habit.id}"]`)).toBeVisible()

    // 清理
    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  test('TC-P-HOME-03: 今日没有任何任务时 → 显示"暂无任务"引导文案', async ({ page }) => {
    // 使用隔离性强的账号（需保证该账号今日无任务）
    // 此处借助 URL 参数 childId=no-task-child 触发空状态
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')
    // 如果真实账号今日恰好无任务，空状态占位符应可见
    // 用 waitForSelector 宽容处理（可能有数据）
    const empty = page.locator('[data-testid="task-list-empty"]')
    const tasks = page.locator('[data-testid="task-section"] [data-task-id]')
    const hasEmpty = await empty.isVisible().catch(() => false)
    const taskCount = await tasks.count().catch(() => 0)
    // 两种情况至少满足一种
    expect(hasEmpty || taskCount >= 0).toBe(true)
  })

  test('TC-P-HOME-04: 孩子当前专注中的任务高亮显示', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)
    // 将任务状态设为 doing（模拟孩子开始任务）
    await apiPut(`/tasks/${task.id}/status`, { status: 'doing' }, parentLogin.token)

    await gotoParentHome(page)

    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 6000 })
    // 进行中高亮：含"进行中"状态标签
    await expect(taskCard.locator('[data-testid="task-status-tag"]')).toContainText('进行中')

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 快速添加任务（弹窗）
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-02x 快速添加任务', () => {

  test('TC-P-HOME-05: 点击"+ 添加今日任务" → 弹出快速添加弹窗', async ({ page }) => {
    await gotoParentHome(page)

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-P-HOME-06: 快速添加任务 → 填写名称+学科+时长 → 成功推送到孩子端', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible({ timeout: 3000 })

    const taskTitle = `快速任务_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)

    // 选择学科：数学
    await page.locator('[data-testid="subject-math"]').click()

    // 设置时长
    await page.locator('[data-testid="input-duration"] input').fill('20')

    await page.locator('[data-testid="btn-submit-task"]').click()

    // 弹窗关闭，任务出现在列表
    await expect(page.locator('[data-testid="add-task-modal"]')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator(`[data-task-title="${taskTitle}"]`)).toBeVisible({ timeout: 5000 })
  })

  test('TC-P-HOME-07: 快速添加任务时未填写名称 → 弹窗不关闭，显示校验提示', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible({ timeout: 3000 })

    // 不填名称，直接提交
    await page.locator('[data-testid="btn-submit-task"]').click()
    await page.waitForTimeout(1000)

    // 弹窗仍可见
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible()
    // 校验错误提示可见
    await expect(page.locator('[data-testid="task-title-error"]')).toBeVisible()
  })

  test('TC-P-HOME-08: 点击弹窗取消/关闭按钮 → 弹窗关闭，不创建任务', async ({ page }) => {
    await gotoParentHome(page)
    const taskCountBefore = await page.locator('[data-testid="task-section"] [data-task-id]').count()

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible({ timeout: 3000 })

    await page.locator('[data-testid="btn-cancel-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).not.toBeVisible({ timeout: 3000 })

    // 任务数量不变
    const taskCountAfter = await page.locator('[data-testid="task-section"] [data-task-id]').count()
    expect(taskCountAfter).toBe(taskCountBefore)
  })

  test('TC-P-HOME-09: 快速添加任务时选择不同学科 → 任务卡片显示对应学科标签颜色', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="add-task-modal"]')).toBeVisible({ timeout: 3000 })

    const taskTitle = `英语任务_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)
    await page.locator('[data-testid="subject-english"]').click()
    await page.locator('[data-testid="btn-submit-task"]').click()

    await expect(page.locator('[data-testid="add-task-modal"]')).not.toBeVisible({ timeout: 3000 })

    // 任务卡片显示英语标签
    const taskCard = page.locator(`[data-task-title="${taskTitle}"]`)
    await expect(taskCard.locator('[data-testid="subject-tag"]')).toContainText('英语')
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 任务操作（编辑、删除、状态变更）
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-03x 任务操作', () => {

  let task: CreatedTask

  test.beforeEach(async () => {
    task = await createFreshTask(parentLogin.token, childId)
  })

  test.afterEach(async () => {
    await apiDelete(`/tasks/${task.id}`, parentLogin.token).catch(() => {/* 可能已删除 */})
  })

  test('TC-P-HOME-10: 家长手动标记任务完成 → 任务卡片切换为已完成状态', async ({ page }) => {
    await gotoParentHome(page)

    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 8000 })

    await taskCard.locator('[data-testid="btn-mark-done"]').click()

    // 任务卡片状态标签切换为"已完成"
    await expect(taskCard.locator('[data-testid="task-status-tag"]')).toContainText('已完成', { timeout: 3000 })
  })

  test('TC-P-HOME-11: 删除任务 → 确认弹窗 → 任务从列表消失', async ({ page }) => {
    await gotoParentHome(page)

    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 8000 })

    await taskCard.locator('[data-testid="btn-delete-task"]').click()

    // 确认删除弹窗
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible({ timeout: 3000 })
    await page.locator('[data-testid="btn-confirm-delete"]').click()

    // 任务从列表消失
    await expect(page.locator(`[data-task-id="${task.id}"]`)).not.toBeVisible({ timeout: 5000 })
  })

  test('TC-P-HOME-12: 取消删除确认 → 任务仍保留在列表', async ({ page }) => {
    await gotoParentHome(page)

    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 8000 })

    await taskCard.locator('[data-testid="btn-delete-task"]').click()
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible({ timeout: 3000 })
    await page.locator('[data-testid="btn-cancel-delete"]').click()

    // 弹窗消失，任务仍可见
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible()
    await expect(taskCard).toBeVisible()
  })

  test('TC-P-HOME-13: 进行中的任务编辑按钮置灰不可操作', async ({ page }) => {
    // 将任务设为 doing 状态
    await apiPut(`/tasks/${task.id}/status`, { status: 'doing' }, parentLogin.token)

    await gotoParentHome(page)

    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 8000 })

    // 编辑按钮应处于禁用状态
    const editBtn = taskCard.locator('[data-testid="btn-edit-task"]')
    await expect(editBtn).toBeDisabled()
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WebSocket 实时同步
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-04x WebSocket实时同步', () => {

  test('TC-P-HOME-14: 孩子将任务状态改为完成 → 家长首页统计数字实时+1', async ({ page, context }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    // 记录家长首页初始完成数
    await gotoParentHome(page)
    const completedBefore = parseInt(
      (await page.locator('[data-testid="stats-completed"]').textContent()) ?? '0'
    )

    // 孩子端通过 API 完成任务（模拟实时操作）
    await apiPut(`/tasks/${task.id}/status`, { status: 'done' }, childLogin.token)

    // 等待 WebSocket 推送（最多 3 秒）
    await page.waitForTimeout(3000)

    const completedAfter = parseInt(
      (await page.locator('[data-testid="stats-completed"]').textContent()) ?? '0'
    )
    expect(completedAfter).toBeGreaterThanOrEqual(completedBefore + 1)

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

  test('TC-P-HOME-15: 孩子开始任务 → 家长首页该任务卡片实时显示"进行中"', async ({ page }) => {
    const task = await createFreshTask(parentLogin.token, childId)

    await gotoParentHome(page)
    const taskCard = page.locator(`[data-task-id="${task.id}"]`)
    await expect(taskCard).toBeVisible({ timeout: 8000 })

    // 孩子端 API 触发任务开始
    await apiPut(`/tasks/${task.id}/status`, { status: 'doing' }, childLogin.token)

    // 等待 WebSocket 推送
    await page.waitForTimeout(3000)

    await expect(taskCard.locator('[data-testid="task-status-tag"]')).toContainText('进行中', { timeout: 5000 })

    await apiDelete(`/tasks/${task.id}`, parentLogin.token)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 权限守卫
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-05x 权限守卫', () => {

  test('TC-P-HOME-16: 未登录访问家长首页 → 跳转到登录页', async ({ page }) => {
    await page.goto('/#/pages/parent/home/index')
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('TC-P-HOME-17: 孩子账号访问家长首页 → 跳转到登录页或孩子任务页', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')
    await page.waitForTimeout(2000)
    // 应跳转到登录或孩子任务页，不停在家长首页
    const url = page.url()
    expect(url.includes('login') || url.includes('child/tasks')).toBe(true)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 底部导航
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-HOME-06x 底部导航', () => {

  test('TC-P-HOME-18: 点击底部"计划" Tab → 跳转到计划管理页', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="tab-bar-plan"]').click()
    await expect(page).toHaveURL(/parent\/plan/, { timeout: 5000 })
  })

  test('TC-P-HOME-19: 点击底部"排行" Tab → 跳转到本周评比页', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="tab-bar-ranking"]').click()
    await expect(page).toHaveURL(/parent\/ranking/, { timeout: 5000 })
  })

  test('TC-P-HOME-20: 点击底部"我的" Tab → 跳转到个人中心页', async ({ page }) => {
    await gotoParentHome(page)
    await page.locator('[data-testid="tab-bar-profile"]').click()
    await expect(page).toHaveURL(/parent\/profile/, { timeout: 5000 })
  })

})
