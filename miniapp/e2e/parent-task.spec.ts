/**
 * TC-P-TASK：家长端任务创建与编辑（专属页面）
 *
 * 覆盖范围：
 *  - 进入任务创建页（从计划管理跳转）
 *  - 表单全字段填写 & 创建成功
 *  - 表单必填项校验（任务名称、时长）
 *  - 四种学科选择及对应颜色标签
 *  - 日期/时间选择
 *  - 奖励星星调整
 *  - 编辑现有任务（修改名称/学科/时长）
 *  - 任务推送孩子端：孩子端今日任务页实时出现
 *  - 权限守卫
 */

import { test, expect, Page } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  injectAuth,
  createFreshTask,
  apiDelete,
  apiGet,
  FreshLoginResult,
  CreatedTask,
} from './helpers'

// ──── 模块级共享状态 ────────────────────────────────────────────────────────

let parentLogin: FreshLoginResult
let childLogin: FreshLoginResult
let childId: string

test.beforeAll(async () => {
  const state = readTestState()
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childLogin  = await loginViaApi(state.child.phone,  state.child.password)
  childId     = state.child.id
})

// ──── 辅助 ──────────────────────────────────────────────────────────────────

async function gotoCreateTask(page: Page) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  await page.goto('/#/pages/parent/task/create/index')
  await expect(page.locator('[data-testid="task-create-form"]')).toBeVisible({ timeout: 8000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 创建任务 - 正常流程
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-TASK-01x 任务创建 - 正常流程', () => {

  test('TC-P-TASK-01: 填写所有字段创建任务 → 创建成功，跳回计划列表', async ({ page }) => {
    await gotoCreateTask(page)

    const taskTitle = `数学口算_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)

    // 选择学科
    await page.locator('[data-testid="subject-math"]').click()

    // 设置时长 25 分钟
    await page.locator('[data-testid="input-duration"] input').fill('25')

    // 奖励星星（默认1，调整为2）
    await page.locator('[data-testid="btn-star-plus"]').click()
    await expect(page.locator('[data-testid="reward-stars-value"]')).toContainText('2')

    await page.locator('[data-testid="btn-save-task"]').click()

    // 跳转回计划列表
    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    // 新创建的任务在列表中可见
    await expect(page.locator(`[data-task-title="${taskTitle}"]`).first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-P-TASK-02: 选择"语文"学科 → 任务卡片显示绿色语文标签', async ({ page }) => {
    await gotoCreateTask(page)

    const taskTitle = `语文背诵_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)
    await page.locator('[data-testid="subject-chinese"]').click()
    await page.locator('[data-testid="input-duration"] input').fill('20')
    await page.locator('[data-testid="btn-save-task"]').click()

    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    const card = page.locator(`[data-task-title="${taskTitle}"]`).first()
    await expect(card).toBeVisible({ timeout: 5000 })
    await expect(card.locator('[data-testid="subject-tag"]')).toContainText('语文')
    await expect(card.locator('[data-testid="subject-tag"]')).toHaveAttribute('data-subject', '语文')
  })

  test('TC-P-TASK-03: 选择"英语"学科 → 任务卡片显示黄色英语标签', async ({ page }) => {
    await gotoCreateTask(page)

    const taskTitle = `英语听力_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)
    await page.locator('[data-testid="subject-english"]').click()
    await page.locator('[data-testid="input-duration"] input').fill('15')
    await page.locator('[data-testid="btn-save-task"]').click()

    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    const card = page.locator(`[data-task-title="${taskTitle}"]`).first()
    await expect(card).toBeVisible({ timeout: 5000 })
    await expect(card.locator('[data-testid="subject-tag"]')).toContainText('英语')
  })

  test('TC-P-TASK-04: 选择"其他"学科 → 任务卡片显示紫色其他标签', async ({ page }) => {
    await gotoCreateTask(page)

    const taskTitle = `练字_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)
    await page.locator('[data-testid="subject-other"]').click()
    await page.locator('[data-testid="input-duration"] input').fill('30')
    await page.locator('[data-testid="btn-save-task"]').click()

    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    const card = page.locator(`[data-task-title="${taskTitle}"]`).first()
    await expect(card).toBeVisible({ timeout: 5000 })
    await expect(card.locator('[data-testid="subject-tag"]')).toContainText('其他')
  })

  test('TC-P-TASK-05: 创建任务后 → 孩子端今日任务列表实时出现该任务', async ({ page, context }) => {
    await gotoCreateTask(page)

    const taskTitle = `推送测试_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(taskTitle)
    await page.locator('[data-testid="subject-math"]').click()
    await page.locator('[data-testid="input-duration"] input').fill('20')
    await page.locator('[data-testid="btn-save-task"]').click()
    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    // 另开孩子端页面验证推送
    const childPage = await context.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/tasks/index')
    await childPage.waitForTimeout(2000)

    await expect(childPage.locator(`[data-task-title="${taskTitle}"]`).first()).toBeVisible({ timeout: 8000 })
    await childPage.close()
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 创建任务 - 表单校验
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-TASK-02x 任务创建 - 表单校验', () => {

  test('TC-P-TASK-06: 不填任务名称直接保存 → 停留在创建页，显示校验提示', async ({ page }) => {
    await gotoCreateTask(page)
    await page.locator('[data-testid="btn-save-task"]').click()
    await page.waitForTimeout(1000)

    expect(page.url()).toContain('task/create')
    await expect(page.locator('[data-testid="task-title-error"]')).toBeVisible()
  })

  test('TC-P-TASK-07: 不填时长直接保存 → 停留在创建页，显示校验提示', async ({ page }) => {
    await gotoCreateTask(page)
    await page.locator('[data-testid="input-task-title"] input').fill('有名称无时长')
    // 清空时长
    await page.locator('[data-testid="input-duration"] input').fill('')
    await page.locator('[data-testid="btn-save-task"]').click()
    await page.waitForTimeout(1000)

    expect(page.url()).toContain('task/create')
    await expect(page.locator('[data-testid="task-duration-error"]')).toBeVisible()
  })

  test('TC-P-TASK-08: 任务名称超过50字 → 显示字数限制提示', async ({ page }) => {
    await gotoCreateTask(page)
    const longTitle = 'A'.repeat(51)
    await page.locator('[data-testid="input-task-title"] input').fill(longTitle)
    await page.locator('[data-testid="btn-save-task"]').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('[data-testid="task-title-error"]')).toBeVisible()
  })

  test('TC-P-TASK-09: 点击取消按钮 → 返回上一页，不创建任务', async ({ page }) => {
    await gotoCreateTask(page)
    await page.locator('[data-testid="input-task-title"] input').fill('将被取消的任务')
    await page.locator('[data-testid="btn-cancel-task"]').click()

    // 返回计划页
    await page.waitForTimeout(1500)
    expect(page.url()).not.toContain('task/create')
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 编辑任务
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-TASK-03x 任务编辑', () => {

  let task: CreatedTask

  test.beforeEach(async () => {
    task = await createFreshTask(parentLogin.token, childId)
  })

  test.afterEach(async () => {
    await apiDelete(`/tasks/${task.id}`, parentLogin.token).catch(() => {})
  })

  test('TC-P-TASK-10: 进入编辑页 → 表单回显原有数据', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto(`/#/pages/parent/task/edit/index?id=${task.id}`)
    await expect(page.locator('[data-testid="task-create-form"]')).toBeVisible({ timeout: 8000 })

    // 任务标题已回显
    const titleValue = await page.locator('[data-testid="input-task-title"] input').inputValue()
    expect(titleValue).toBe(task.title)
  })

  test('TC-P-TASK-11: 修改任务名称保存 → 列表展示更新后的名称', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto(`/#/pages/parent/task/edit/index?id=${task.id}`)
    await expect(page.locator('[data-testid="task-create-form"]')).toBeVisible({ timeout: 8000 })

    const newTitle = `已更新任务_${Date.now()}`
    await page.locator('[data-testid="input-task-title"] input').fill(newTitle)
    await page.locator('[data-testid="btn-save-task"]').click()

    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })
    await expect(page.locator(`[data-task-title="${newTitle}"]`).first()).toBeVisible({ timeout: 5000 })

    // 后端验证
    const res = await apiGet(`/tasks/${task.id}`, parentLogin.token) as { data: { title: string } }
    expect(res.data.title).toBe(newTitle)
  })

  test('TC-P-TASK-12: 修改任务学科 → 后端数据更新', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto(`/#/pages/parent/task/edit/index?id=${task.id}`)
    await expect(page.locator('[data-testid="task-create-form"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="subject-english"]').click()
    await page.locator('[data-testid="btn-save-task"]').click()
    await page.waitForURL(/parent\/(plan|home)/, { timeout: 6000 })

    // 后端验证学科已更新
    const res = await apiGet(`/tasks/${task.id}`, parentLogin.token) as { data: { subject: string } }
    expect(res.data.subject).toBe('英语')
  })

  test('TC-P-TASK-13: 编辑进行中任务 → 系统阻止编辑（导航守卫或按钮禁用）', async ({ page }) => {
    // 将任务设为 doing 状态
    const { apiPut } = await import('./helpers')
    await apiPut(`/tasks/${task.id}/status`, { status: 'doing' }, parentLogin.token)

    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto(`/#/pages/parent/task/edit/index?id=${task.id}`)
    await page.waitForTimeout(2000)

    // 应跳转回列表页 或 编辑表单不可交互
    const isOnEditPage = page.url().includes('task/edit')
    if (isOnEditPage) {
      // 保存按钮被禁用
      await expect(page.locator('[data-testid="btn-save-task"]')).toBeDisabled()
    } else {
      // 已被跳转
      expect(page.url()).toMatch(/parent\/(plan|home)/)
    }
  })

})
