/**
 * TC-P-PROF：家长端个人中心 & 设置
 *
 * 覆盖范围：
 *  个人中心（profile）
 *  - 进入个人中心 → 显示家长信息（昵称/手机号）
 *  - 孩子管理 → 生成邀请码
 *  - 孩子管理 → 邀请码绑定孩子账号（集成流程）
 *  - 跳转到设置页
 *
 *  设置页（settings）
 *  - 设置菜单各入口可见
 *  - 作息设置 → 可修改睡觉时间，保存成功
 *  - 作息设置 → 睡觉时间范围校验（19:00-23:00）
 *  - 通知设置 → 开关切换
 *
 *  权限守卫
 *  - 未登录 → 跳转登录
 *  - 孩子账号 → 无法访问家长设置
 */

import { test, expect, Page } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  injectAuth,
  apiGet,
  apiPost,
  FreshLoginResult,
} from './helpers'

// ──── 模块级共享状态 ────────────────────────────────────────────────────────

let parentLogin: FreshLoginResult
let childLogin: FreshLoginResult

test.beforeAll(async () => {
  const state = readTestState()
  parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
  childLogin  = await loginViaApi(state.child.phone,  state.child.password)
})

// ──── 辅助 ──────────────────────────────────────────────────────────────────

async function gotoProfile(page: Page) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  await page.goto('/#/pages/parent/profile/index')
  await expect(page.locator('[data-testid="profile-page"]')).toBeVisible({ timeout: 8000 })
}

async function gotoSettings(page: Page) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  await page.goto('/#/pages/parent/settings/index')
  await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 8000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 个人中心基础展示
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-01x 个人中心基础展示', () => {

  test('TC-P-PROF-01: 进入个人中心 → 显示家长昵称', async ({ page }) => {
    await gotoProfile(page)

    const nicknameEl = page.locator('[data-testid="profile-nickname"]')
    await expect(nicknameEl).toBeVisible()
    const nickname = await nicknameEl.textContent()
    expect(nickname?.trim().length).toBeGreaterThan(0)
  })

  test('TC-P-PROF-02: 个人中心展示绑定的孩子信息', async ({ page }) => {
    await gotoProfile(page)

    // 孩子信息卡片或列表区域
    await expect(page.locator('[data-testid="child-info-section"]')).toBeVisible()
  })

  test('TC-P-PROF-03: 点击"设置"入口 → 跳转到设置页', async ({ page }) => {
    await gotoProfile(page)

    await page.locator('[data-testid="btn-goto-settings"]').click()
    await page.waitForURL(/parent\/settings/, { timeout: 5000 })
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible()
  })

  test('TC-P-PROF-04: 点击"孩子管理"入口 → 跳转到孩子管理页', async ({ page }) => {
    await gotoProfile(page)

    await page.locator('[data-testid="btn-child-manage"]').click()
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('child-manage')
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 孩子管理 - 邀请码
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-02x 孩子管理 - 邀请码', () => {

  test('TC-P-PROF-05: 点击"生成邀请码" → 显示邀请码（6位字符）', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/child-manage/index')
    await expect(page.locator('[data-testid="child-manage-page"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-gen-invite-code"]').click()

    const codeEl = page.locator('[data-testid="invite-code"]')
    await expect(codeEl).toBeVisible({ timeout: 5000 })
    const code = await codeEl.textContent()
    // 邀请码格式：6位字母数字
    expect(code?.trim()).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('TC-P-PROF-06: 生成的邀请码与后端 API 返回的一致', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/child-manage/index')
    await expect(page.locator('[data-testid="child-manage-page"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-gen-invite-code"]').click()

    const uiCode = (await page.locator('[data-testid="invite-code"]').textContent())?.trim()

    // 后端验证
    const res = await apiGet('/auth/invite', parentLogin.token) as { data: { code: string } }
    expect(uiCode).toBe(res.data.code)
  })

  test('TC-P-PROF-07: 孩子用邀请码绑定家长 → 绑定成功，孩子信息出现在家长孩子列表', async ({ page }) => {
    // 先通过 API 生成邀请码
    const inviteRes = await apiPost('/auth/invite', {}, parentLogin.token) as {
      data: { code: string }
    }
    const code = inviteRes.data.code

    // 孩子账号绑定
    const bindRes = await apiPost('/auth/bind', { code }, childLogin.token) as { code: number }
    expect(bindRes.code).toBe(200)

    // 验证家长个人中心孩子列表存在
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/child-manage/index')
    await expect(page.locator('[data-testid="child-manage-page"]')).toBeVisible({ timeout: 8000 })

    const childItem = page.locator('[data-testid^="child-item-"]')
    await expect(childItem.first()).toBeVisible({ timeout: 5000 })
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 设置页 - 菜单结构
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-03x 设置页菜单结构', () => {

  test('TC-P-PROF-08: 设置页包含"账号与安全"入口', async ({ page }) => {
    await gotoSettings(page)
    await expect(page.locator('[data-testid="settings-account"]')).toBeVisible()
  })

  test('TC-P-PROF-09: 设置页包含"通知设置"入口', async ({ page }) => {
    await gotoSettings(page)
    await expect(page.locator('[data-testid="settings-notification"]')).toBeVisible()
  })

  test('TC-P-PROF-10: 设置页包含"作息设置"入口', async ({ page }) => {
    await gotoSettings(page)
    await expect(page.locator('[data-testid="settings-schedule"]')).toBeVisible()
  })

  test('TC-P-PROF-11: 设置页包含"关于"入口（版本号）', async ({ page }) => {
    await gotoSettings(page)
    await expect(page.locator('[data-testid="settings-about"]')).toBeVisible()
    // 版本信息可见
    await page.locator('[data-testid="settings-about"]').click()
    await expect(page.locator('[data-testid="app-version"]')).toBeVisible({ timeout: 3000 })
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 作息设置
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-04x 作息设置', () => {

  async function gotoScheduleSettings(page: Page) {
    await gotoSettings(page)
    await page.locator('[data-testid="settings-schedule"]').click()
    await expect(page.locator('[data-testid="schedule-settings-page"]')).toBeVisible({ timeout: 5000 })
  }

  test('TC-P-PROF-12: 进入作息设置 → 显示睡觉时间选择器', async ({ page }) => {
    await gotoScheduleSettings(page)
    await expect(page.locator('[data-testid="sleep-time-picker"]')).toBeVisible()
  })

  test('TC-P-PROF-13: 修改睡觉时间为21:30 → 保存成功，重新进入显示21:30', async ({ page }) => {
    await gotoScheduleSettings(page)

    // 选择 21:30
    await page.locator('[data-testid="sleep-time-picker"]').fill('21:30')
    await page.locator('[data-testid="btn-save-schedule"]').click()

    // 成功提示
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({ timeout: 5000 })

    // 重新进入验证持久化
    await gotoScheduleSettings(page)
    const savedTime = await page.locator('[data-testid="sleep-time-picker"]').inputValue()
    expect(savedTime).toBe('21:30')
  })

  test('TC-P-PROF-14: 睡觉时间设置为23:59（超范围）→ 显示校验错误', async ({ page }) => {
    await gotoScheduleSettings(page)

    await page.locator('[data-testid="sleep-time-picker"]').fill('23:59')
    await page.locator('[data-testid="btn-save-schedule"]').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('[data-testid="sleep-time-error"]')).toBeVisible()
  })

  test('TC-P-PROF-15: 睡觉时间设置为18:00（早于下限）→ 显示校验错误', async ({ page }) => {
    await gotoScheduleSettings(page)

    await page.locator('[data-testid="sleep-time-picker"]').fill('18:00')
    await page.locator('[data-testid="btn-save-schedule"]').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('[data-testid="sleep-time-error"]')).toBeVisible()
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 通知设置
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-05x 通知设置', () => {

  async function gotoNotificationSettings(page: Page) {
    await gotoSettings(page)
    await page.locator('[data-testid="settings-notification"]').click()
    await expect(page.locator('[data-testid="notification-settings-page"]')).toBeVisible({ timeout: 5000 })
  }

  test('TC-P-PROF-16: 通知设置页显示任务提醒开关', async ({ page }) => {
    await gotoNotificationSettings(page)
    await expect(page.locator('[data-testid="switch-task-reminder"]')).toBeVisible()
  })

  test('TC-P-PROF-17: 关闭任务提醒开关 → 开关状态切换，保存后再进入仍为关闭', async ({ page }) => {
    await gotoNotificationSettings(page)

    const toggle = page.locator('[data-testid="switch-task-reminder"]')
    const currentChecked = await toggle.isChecked()

    // 切换状态
    await toggle.click()
    const newChecked = await toggle.isChecked()
    expect(newChecked).toBe(!currentChecked)

    // 保存
    await page.locator('[data-testid="btn-save-notification"]').click()
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({ timeout: 5000 })

    // 重新进入验证
    await gotoNotificationSettings(page)
    const savedChecked = await page.locator('[data-testid="switch-task-reminder"]').isChecked()
    expect(savedChecked).toBe(newChecked)

    // 还原（如果改变了）
    if (newChecked !== currentChecked) {
      await page.locator('[data-testid="switch-task-reminder"]').click()
      await page.locator('[data-testid="btn-save-notification"]').click()
    }
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 权限守卫
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-PROF-06x 权限守卫', () => {

  test('TC-P-PROF-18: 未登录访问个人中心 → 跳转到登录页', async ({ page }) => {
    await page.goto('/#/pages/parent/profile/index')
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('TC-P-PROF-19: 未登录访问设置页 → 跳转到登录页', async ({ page }) => {
    await page.goto('/#/pages/parent/settings/index')
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('TC-P-PROF-20: 孩子账号访问家长设置页 → 拒绝访问', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/parent/settings/index')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url.includes('login') || url.includes('child/tasks')).toBe(true)
  })

})
