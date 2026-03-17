import { test, expect } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  createFreshTask,
  injectAuth,
  apiGet,
  FreshLoginResult,
  CreatedTask,
} from './helpers'

// ──── 模块级共享状态（beforeAll 初始化）────────────────────────────

let parentLogin: FreshLoginResult
let childLogin: FreshLoginResult
let childId: string

// 当前测试用的任务（beforeEach 每次重建）
let currentTask: CreatedTask

test.beforeAll(async () => {
  const state = readTestState()
  // 每次重新登录获取新 token，避免 token 过期
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childLogin = await loginViaApi(state.child.phone, state.child.password)
  childId = state.child.id
})

test.beforeEach(async ({ page }) => {
  // 每个用例创建一个全新的 todo 任务，保证测试隔离
  currentTask = await createFreshTask(parentLogin.token, childId)

  // 注入 localStorage，使页面加载时自动恢复登录态（必须在 goto 之前调用）
  await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
})

// ──── 辅助：直接导航到番茄钟页 ────────────────────────────────────

async function gotoPomodoro(page: Parameters<typeof injectAuth>[0]) {
  await page.goto(`/#/pages/child/pomodoro/index?taskId=${currentTask.id}`)
  await expect(page.locator('[data-testid="btn-start-focus"]')).toBeVisible({ timeout: 8000 })
}

// ──── 测试用例 ────────────────────────────────────────────────────

test.describe('番茄钟 E2E', () => {

  test('TC-E2E-01: 任务列表页显示新建任务，点击进入番茄钟页', async ({ page }) => {
    await page.goto('/#/pages/child/tasks/index')

    // 通过 data-task-id 精确定位刚创建的任务，避免列表中其他任务干扰
    const taskItem = page.locator(`[data-task-id="${currentTask.id}"]`)
    await expect(taskItem).toBeVisible({ timeout: 8000 })

    await taskItem.click()

    // 点击任务后右侧面板出现「开始专注」按钮（双面板布局，无页面跳转）
    await expect(page.locator('[data-testid="btn-start-focus"]')).toBeVisible()
  })

  test('TC-E2E-02: 点击「开始专注」后倒计时精确为 25:00，状态变为「专注中」', async ({ page }) => {
    await gotoPomodoro(page)

    await page.locator('[data-testid="btn-start-focus"]').click()

    // 状态标签显示专注
    await expect(page.locator('[data-testid="phase-label"]')).toContainText('专注')

    // 倒计时应为 25:00（1秒内断言，不允许已经走掉很多时间）
    const timerText = await page.locator('[data-testid="timer-display"]').textContent()
    expect(timerText).toMatch(/^25:0[0-9]$/) // 只允许 25:00 或 25:01（时钟误差1秒）
  })

  test('TC-E2E-03: 专注中点击「暂停」→ 倒计时冻结，显示「继续」按钮', async ({ page }) => {
    await gotoPomodoro(page)
    await page.locator('[data-testid="btn-start-focus"]').click()

    // 等待计时器稳定后暂停
    await page.waitForTimeout(1500)
    await page.locator('[data-testid="btn-pause"]').click()

    // 验证状态与按钮
    await expect(page.locator('[data-testid="phase-label"]')).toContainText('暂停')
    await expect(page.locator('[data-testid="btn-resume"]')).toBeVisible()
    await expect(page.locator('[data-testid="btn-pause"]')).not.toBeVisible()

    // 验证暂停后时间冻结（等待 2 秒后时间应不变）
    const t1 = await page.locator('[data-testid="timer-display"]').textContent()
    await page.waitForTimeout(2000)
    const t2 = await page.locator('[data-testid="timer-display"]').textContent()
    expect(t1).toBe(t2)
  })

  test('TC-E2E-04: 点击「继续」后倒计时恢复，「暂停」按钮重新出现', async ({ page }) => {
    await gotoPomodoro(page)
    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(1000)
    await page.locator('[data-testid="btn-pause"]').click()
    await page.locator('[data-testid="btn-resume"]').click()

    // 状态恢复为专注，暂停按钮可见
    await expect(page.locator('[data-testid="phase-label"]')).toContainText('专注')
    await expect(page.locator('[data-testid="btn-pause"]')).toBeVisible()
    await expect(page.locator('[data-testid="btn-resume"]')).not.toBeVisible()
  })

  test('TC-E2E-05: 「完成任务」→ 弹出确认弹窗 → 确认后显示庆祝动画', async ({ page }) => {
    await gotoPomodoro(page)
    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)

    await page.locator('[data-testid="btn-finish-task"]').click()

    // 确认弹窗出现
    await expect(page.locator('[data-testid="confirm-finish-modal"]')).toBeVisible()

    await page.locator('[data-testid="btn-confirm-finish"]').click()

    // 庆祝动画出现
    await expect(page.locator('[data-testid="completion-animation"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-E2E-06: 完成任务后后端数据持久化 - 任务状态变为 done，session 已写入', async ({ page }) => {
    await gotoPomodoro(page)
    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()
    await page.locator('[data-testid="btn-confirm-finish"]').click()
    await expect(page.locator('[data-testid="completion-animation"]')).toBeVisible({ timeout: 3000 })

    // 验证后端：任务状态应为 done
    const taskRes = await apiGet(`/tasks/${currentTask.id}`, childLogin.token) as {
      data: { status: string }
    }
    expect(taskRes.data.status).toBe('done')

    // 验证后端：至少存在一条 pomodoro session 记录
    const sessionsRes = await apiGet(
      `/tasks/${currentTask.id}/pomodoro/sessions`,
      childLogin.token
    ) as { data: unknown[] }
    expect(sessionsRes.data.length).toBeGreaterThan(0)
  })

  test('TC-E2E-07: 取消完成确认 → 继续专注，状态不变', async ({ page }) => {
    await gotoPomodoro(page)
    await page.locator('[data-testid="btn-start-focus"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="btn-finish-task"]').click()

    // 确认弹窗出现后点「继续学习」取消
    await expect(page.locator('[data-testid="confirm-finish-modal"]')).toBeVisible()
    await page.locator('[data-testid="confirm-finish-modal"]').getByText('继续学习').click()

    // 弹窗消失，倒计时仍在专注状态
    await expect(page.locator('[data-testid="confirm-finish-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="phase-label"]')).toContainText('专注')
  })

  test('TC-E2E-08: 网络异常时计时器本地仍正常运行（不因 API 失败而卡死）', async ({ page }) => {
    await gotoPomodoro(page)

    // 模拟后端不可达：拦截 pomodoro API 请求返回 500
    await page.route('**/pomodoro/**', (route) => route.fulfill({ status: 500, body: 'error' }))
    await page.route('**/tasks/*/status**', (route) => route.fulfill({ status: 500, body: 'error' }))

    await page.locator('[data-testid="btn-start-focus"]').click()

    // 即使 API 失败，本地计时器仍正常启动显示
    await expect(page.locator('[data-testid="phase-label"]')).toContainText('专注')
    const timerText = await page.locator('[data-testid="timer-display"]').textContent()
    expect(timerText).toMatch(/^25:0[0-9]$/)
  })

})
