import { test, expect } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  createFreshHabit,
  checkInHabitViaApi,
  injectAuth,
  apiGet,
  apiDelete,
  apiPut,
  FreshLoginResult,
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
// 家长端：习惯管理 CRUD
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-HABIT-P 家长端习惯管理', () => {

  // ─── TC-HABIT-P01：创建每日习惯 ──────────────────────────────

  test('TC-HABIT-P01: 家长创建每日打卡习惯 → 习惯出现在孩子计划列表', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/plan/index')

    // 点击"添加习惯"按钮（计划管理页 → 习惯 Tab）
    await page.locator('[data-testid="tab-habits"]').click()
    await page.locator('[data-testid="btn-add-habit"]').click()

    // 填写习惯创建表单
    const habitName = `每天阅读30分钟_${Date.now()}`
    await page.locator('[data-testid="input-habit-name"] input').fill(habitName)

    // 选择图标（默认已选中第一个，点击另一个图标）
    await page.locator('[data-testid="habit-icon-🏃"]').click()

    // 选择频率：每天（默认已选）
    await page.locator('[data-testid="frequency-daily"]').click()

    // 奖励星星：默认1颗，保持不变
    await page.locator('[data-testid="btn-save-habit"]').click()

    // 习惯列表中出现新建的习惯（.last() 取 active plan 页，避免背后 hidden 旧页面干扰）
    await expect(page.locator(`[data-habit-name="${habitName}"]`).last()).toBeVisible({ timeout: 5000 })
  })

  // ─── TC-HABIT-P02：创建习惯缺少名称 → 表单校验阻止提交 ──────

  test('TC-HABIT-P02: 创建习惯时未填名称 → 停留在创建页，不提交', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/habit/create/index')
    await expect(page.locator('[data-testid="btn-save-habit"]')).toBeVisible({ timeout: 8000 })

    // 不填名称，直接提交
    await page.locator('[data-testid="btn-save-habit"]').click()
    await page.waitForTimeout(1000)

    // 停留在创建页（URL 不变）
    expect(page.url()).toContain('habit/create')
    // 显示校验错误提示
    await expect(page.locator('[data-testid="habit-name-error"]')).toBeVisible()
  })

  // ─── TC-HABIT-P03：创建每周习惯（指定周几）────────────────────

  test('TC-HABIT-P03: 家长创建每周三、五打卡习惯 → 频率显示正确', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/habit/create/index')
    await expect(page.locator('[data-testid="input-habit-name"]')).toBeVisible({ timeout: 8000 })

    const habitName = `每周练字_${Date.now()}`
    await page.locator('[data-testid="input-habit-name"] input').fill(habitName)

    // 切换到每周
    await page.locator('[data-testid="frequency-weekly"]').click()

    // 选择周三、周五
    await page.locator('[data-testid="weekday-3"]').click()  // 三
    await page.locator('[data-testid="weekday-5"]').click()  // 五

    await page.locator('[data-testid="btn-save-habit"]').click()

    // 跳转回习惯列表，新习惯可见
    await expect(page.locator(`[data-habit-name="${habitName}"]`).first()).toBeVisible({ timeout: 5000 })

    // 习惯频率标签显示"每周"
    const habitItem = page.locator(`[data-habit-name="${habitName}"]`)
    await expect(habitItem.locator('[data-testid="habit-frequency-label"]')).toContainText('每周')
  })

  // ─── TC-HABIT-P04：编辑习惯名称 → 更新成功 ──────────────────

  test('TC-HABIT-P04: 家长编辑习惯名称 → 列表立即更新', async ({ page }) => {
    // 通过 API 预先创建一条习惯
    const habit = await createFreshHabit(parentLogin.token, childId, { name: '原始习惯名' })

    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto(`/#/pages/parent/habit/edit/index?id=${habit.id}`)
    await expect(page.locator('[data-testid="input-habit-name"]')).toBeVisible({ timeout: 8000 })

    // 清空并填写新名称
    await page.locator('[data-testid="input-habit-name"] input').fill('')
    const updatedName = `已更新的习惯_${Date.now()}`
    await page.locator('[data-testid="input-habit-name"] input').fill(updatedName)
    await page.locator('[data-testid="btn-save-habit"]').click()

    // 跳转回列表，更新后的名称可见
    await expect(page.locator(`[data-habit-name="${updatedName}"]`).first()).toBeVisible({ timeout: 5000 })

    // 后端数据验证
    const res = await apiGet(`/habits/${habit.id}`, parentLogin.token) as { data: { name: string } }
    expect(res.data.name).toBe(updatedName)
  })

  // ─── TC-HABIT-P05：删除习惯 → 从列表中消失 ──────────────────

  test('TC-HABIT-P05: 家长删除习惯 → 习惯从列表永久移除', async ({ page }) => {
    const habit = await createFreshHabit(parentLogin.token, childId, { name: '待删除习惯' })

    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/plan/index')
    await page.locator('[data-testid="tab-habits"]').click()

    // 找到对应习惯，点击删除按钮
    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 8000 })
    await habitItem.locator('[data-testid="btn-delete-habit"]').click()

    // 确认删除弹窗
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible()
    await page.locator('[data-testid="btn-confirm-delete"]').click()

    // 习惯从列表消失
    await expect(page.locator(`[data-habit-id="${habit.id}"]`)).not.toBeVisible({ timeout: 5000 })

    // 后端验证：GET 返回 404
    const res = await apiGet(`/habits/${habit.id}`, parentLogin.token) as { code: number }
    expect(res.code).toBe(404)
  })

  // ─── TC-HABIT-P06：取消删除 → 习惯保留 ─────────────────────

  test('TC-HABIT-P06: 取消删除确认 → 习惯仍然保留在列表', async ({ page }) => {
    const habit = await createFreshHabit(parentLogin.token, childId, { name: '不删这个' })

    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/plan/index')
    await page.locator('[data-testid="tab-habits"]').click()

    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 8000 })
    await habitItem.locator('[data-testid="btn-delete-habit"]').click()

    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible()
    await page.locator('[data-testid="btn-cancel-delete"]').click()

    // 弹窗消失，习惯仍可见
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible()
    await expect(habitItem).toBeVisible()

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  // ─── TC-HABIT-P07：家长在首页看板查看孩子的习惯完成状态 ──────

  test('TC-HABIT-P07: 孩子打卡后，家长首页看板同步显示已完成状态', async ({ page }) => {
    const habit = await createFreshHabit(parentLogin.token, childId)

    // 孩子通过 API 打卡
    await checkInHabitViaApi(childLogin.token, habit.id)

    // 家长进入首页，查看习惯状态
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    const habitItem = page.locator(`[data-habit-id="${habit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 8000 })
    // 已打卡的习惯显示完成标识
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible()

    // 清理
    await apiDelete(`/habits/${habit.id}`, parentLogin.token)
  })

  // ─── TC-HABIT-P08：今日无习惯时的空状态展示 ──────────────────

  test('TC-HABIT-P08: 习惯列表为空时显示引导文案', async ({ page }) => {
    // 注意：此测试依赖数据库中当前 childId 没有任何习惯
    // 通过 API 预先清空（如果存在），实际跑时可用隔离账号
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/plan/index?tab=habits&childId=empty-child-placeholder')

    // 空状态文案或图标
    await expect(page.locator('[data-testid="habit-list-empty"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="habit-list-empty"]')).toContainText('还没有习惯打卡项')
  })

})

// ═══════════════════════════════════════════════════════════════════
// 孩子端：习惯打卡交互
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-HABIT-C 孩子端打卡交互', () => {

  let currentHabit: CreatedHabit

  test.beforeEach(async () => {
    // 每个用例创建一个全新的习惯，保证测试隔离
    currentHabit = await createFreshHabit(parentLogin.token, childId)
  })

  test.afterEach(async () => {
    // 清理测试数据
    await apiDelete(`/habits/${currentHabit.id}`, parentLogin.token)
  })

  // ─── TC-HABIT-C01：今日任务页展示习惯列表 ────────────────────

  test('TC-HABIT-C01: 孩子进入今日任务页 → 今日习惯列表可见', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')

    // 习惯区域可见
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 新建的习惯出现在列表中
    await expect(page.locator(`[data-habit-id="${currentHabit.id}"]`)).toBeVisible({ timeout: 5000 })
  })

  // ─── TC-HABIT-C02：孩子点击打卡 → 显示动画 + 星星+1 ─────────

  test('TC-HABIT-C02: 孩子点击习惯打卡 → 勾选动画出现，星星数+1', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 记录打卡前的星星数
    const starsBefore = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )

    // 点击打卡按钮
    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()

    // 打勾动画出现（checked 状态）
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 星星浮动动画出现
    await expect(page.locator('[data-testid="star-float-animation"]')).toBeVisible({ timeout: 2000 })

    // 星星数量增加
    await page.waitForTimeout(1000)  // 等待动画结束
    const starsAfter = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )
    expect(starsAfter).toBe(starsBefore + currentHabit.rewardStars)
  })

  // ─── TC-HABIT-C03：已打卡再次点击 → 取消打卡（切换状态）──────

  test('TC-HABIT-C03: 已打卡的习惯再次点击 → 取消打卡，星星回退', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)

    // 先打卡
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    const starsAfterCheckin = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )

    // 再次点击取消打卡
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()

    // 恢复未打卡状态
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).not.toBeVisible({ timeout: 3000 })

    // 星星数回退
    await page.waitForTimeout(1000)
    const starsAfterUncheck = parseInt(
      (await page.locator('[data-testid="star-count"]').textContent()) ?? '0'
    )
    expect(starsAfterUncheck).toBe(starsAfterCheckin - currentHabit.rewardStars)
  })

  // ─── TC-HABIT-C04：打卡后端数据持久化验证 ────────────────────

  test('TC-HABIT-C04: 打卡后后端持久化 → API 查询今日打卡记录存在', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // UI 打卡
    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 后端验证：查询今日打卡记录
    const res = await apiGet(
      `/habits/${currentHabit.id}/checkin/today`,
      childLogin.token
    ) as { data: { checkedIn: boolean } }
    expect(res.data.checkedIn).toBe(true)
  })

  // ─── TC-HABIT-C05：显示连续打卡天数 ─────────────────────────

  test('TC-HABIT-C05: 习惯显示连续打卡天数（🔥 N天）', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await expect(habitItem).toBeVisible({ timeout: 5000 })

    // 连续打卡数元素存在（可能是0或更大，取决于历史数据）
    await expect(habitItem.locator('[data-testid="habit-streak"]')).toBeVisible()
    // 格式匹配：包含数字
    const streakText = await habitItem.locator('[data-testid="habit-streak"]').textContent()
    expect(streakText).toMatch(/\d+/)
  })

  // ─── TC-HABIT-C06：多个习惯全部打卡 → 全部显示完成状态 ──────

  test('TC-HABIT-C06: 列表中的全部习惯打卡完成 → 每个均显示完成图标', async ({ page }) => {
    // 再创建第二个习惯
    const habit2 = await createFreshHabit(parentLogin.token, childId, { name: '额外习惯' })

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 打卡第一个
    const item1 = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await item1.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(item1.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 打卡第二个
    const item2 = page.locator(`[data-habit-id="${habit2.id}"]`)
    await item2.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(item2.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 清理第二个习惯
    await apiDelete(`/habits/${habit2.id}`, parentLogin.token)
  })

  // ─── TC-HABIT-C07：打卡后刷新页面 → 已打卡状态持久保留 ──────

  test('TC-HABIT-C07: 打卡后刷新页面 → 已打卡状态正确还原', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 打卡
    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 3000 })

    // 重新注入 auth（因为刷新会丢失 localStorage），然后刷新
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.reload()
    await page.waitForTimeout(2000)

    // 刷新后仍显示已打卡
    const habitItemAfterReload = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await expect(habitItemAfterReload.locator('[data-testid="habit-checked-icon"]')).toBeVisible({ timeout: 8000 })
  })

})

// ═══════════════════════════════════════════════════════════════════
// 异常流程
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-HABIT-E 习惯打卡异常流程', () => {

  let currentHabit: CreatedHabit

  test.beforeEach(async () => {
    currentHabit = await createFreshHabit(parentLogin.token, childId)
  })

  test.afterEach(async () => {
    await apiDelete(`/habits/${currentHabit.id}`, parentLogin.token)
  })

  // ─── TC-HABIT-E01：网络异常时打卡 → 提示失败，状态不改变 ─────

  test('TC-HABIT-E01: 网络异常时打卡 → 显示错误提示，打卡状态不变', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible({ timeout: 8000 })

    // 拦截打卡 API 请求返回 500
    await page.route(`**/habits/${currentHabit.id}/checkin`, (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ code: 500, message: 'Server Error' }) })
    )

    const habitItem = page.locator(`[data-habit-id="${currentHabit.id}"]`)
    await habitItem.locator('[data-testid="habit-checkin-btn"]').click()

    // 显示错误提示（toast 或 错误文案）
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible({ timeout: 3000 })

    // 打卡状态不变（未显示 checked 图标）
    await expect(habitItem.locator('[data-testid="habit-checked-icon"]')).not.toBeVisible()
  })

  // ─── TC-HABIT-E02：未登录访问孩子任务页 → 跳转到登录页 ──────

  test('TC-HABIT-E02: 未注入 token 直接访问孩子任务页 → 跳转登录', async ({ page }) => {
    // 不调用 injectAuth，直接访问受保护页面
    await page.goto('/#/pages/child/tasks/index')
    await page.waitForTimeout(2000)

    // 应重定向到登录页
    expect(page.url()).toContain('login')
  })

})
