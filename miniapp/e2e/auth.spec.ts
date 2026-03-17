import { test, expect, Page } from '@playwright/test'
import { readTestState, loginViaApi, injectAuth } from './helpers'

// ──── 常量 ────────────────────────────────────────────────────────

// 用时间戳生成本次测试运行专属手机号，避免与历史数据冲突
const RUN_SUFFIX = Date.now().toString().slice(-8)
const NEW_PARENT_PHONE = `139${RUN_SUFFIX}`   // 11位，当次运行唯一
const NEW_CHILD_PHONE  = `138${RUN_SUFFIX}`
const TEST_PASSWORD = 'password123'

// global-setup 创建的固定账号（用于登录/登出测试）
const FIXED_PARENT_PHONE = '13988880000'
const FIXED_CHILD_PHONE  = '13988880001'

// ──── 辅助 ────────────────────────────────────────────────────────

async function gotoLoginPhoneTab(page: Page) {
  await page.goto('/#/pages/login/index')
  await page.locator('[data-testid="tab-phone"]').click()
}

async function switchToRegister(page: Page) {
  await page.locator('[data-testid="tab-register-mode"]').click()
}

async function fillLoginForm(page: Page, phone: string, password: string) {
  await page.locator('[data-testid="input-phone"] input').fill(phone)
  await page.locator('[data-testid="input-password"] input').fill(password)
}

async function fillRegisterForm(
  page: Page,
  phone: string,
  password: string,
  nickname: string,
  role: 'parent' | 'child'
) {
  await page.locator('[data-testid="input-nickname"] input').fill(nickname)
  await page.locator('[data-testid="input-phone"] input').fill(phone)
  await page.locator('[data-testid="input-password"] input').fill(password)
  await page.locator(`[data-testid="role-${role}"]`).click()
}

// ──── 注册流程 ────────────────────────────────────────────────────

test.describe('TC-AUTH 注册流程', () => {

  test('TC-AUTH-01: 家长手机号注册成功 → 跳转家长首页', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await switchToRegister(page)
    await fillRegisterForm(page, NEW_PARENT_PHONE, TEST_PASSWORD, 'E2E新家长', 'parent')
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForURL(/parent\/home/, { timeout: 8000 })
    expect(page.url()).toContain('parent/home')
  })

  test('TC-AUTH-02: 孩子手机号注册成功 → 跳转孩子任务页', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await switchToRegister(page)
    await fillRegisterForm(page, NEW_CHILD_PHONE, TEST_PASSWORD, 'E2E新孩子', 'child')
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForURL(/child\/tasks/, { timeout: 8000 })
    expect(page.url()).toContain('child/tasks')
  })

  test('TC-AUTH-03: 注册时缺少昵称 → 停留在登录页，不跳转', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await switchToRegister(page)

    // 只填手机号和密码，不填昵称
    await page.locator('[data-testid="input-phone"] input').fill('13700000001')
    await page.locator('[data-testid="input-password"] input').fill(TEST_PASSWORD)
    await page.locator('[data-testid="btn-login"]').click()

    // 等待短暂时间，确认页面没有跳转
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('login')
  })

  test('TC-AUTH-04: 注册已存在手机号 → 停留在登录页，不跳转', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await switchToRegister(page)
    // FIXED_PARENT_PHONE 由 global-setup 已创建，必定 409
    await fillRegisterForm(page, FIXED_PARENT_PHONE, TEST_PASSWORD, '重复家长', 'parent')
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForTimeout(1500)
    expect(page.url()).toContain('login')
  })

})

// ──── 登录流程 ────────────────────────────────────────────────────

test.describe('TC-AUTH 登录流程', () => {

  test('TC-AUTH-05: 家长正确凭证登录 → 跳转到家长首页', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await fillLoginForm(page, FIXED_PARENT_PHONE, TEST_PASSWORD)
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForURL(/parent\/home/, { timeout: 8000 })
    expect(page.url()).toContain('parent/home')
  })

  test('TC-AUTH-06: 孩子正确凭证登录 → 跳转到孩子任务页', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await fillLoginForm(page, FIXED_CHILD_PHONE, TEST_PASSWORD)
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForURL(/child\/tasks/, { timeout: 8000 })
    expect(page.url()).toContain('child/tasks')
  })

  test('TC-AUTH-07: 密码错误登录 → 停留在登录页，不跳转', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await fillLoginForm(page, FIXED_PARENT_PHONE, 'wrongpassword')
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('TC-AUTH-08: 未注册手机号登录 → 停留在登录页，不跳转', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await fillLoginForm(page, '13700000099', TEST_PASSWORD)
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('TC-AUTH-09: 未填写手机号直接点登录 → 停留在登录页', async ({ page }) => {
    await gotoLoginPhoneTab(page)
    await page.locator('[data-testid="btn-login"]').click()

    await page.waitForTimeout(1000)
    expect(page.url()).toContain('login')
  })

})

// ──── 登出流程 ────────────────────────────────────────────────────

test.describe('TC-AUTH 登出流程', () => {

  test('TC-AUTH-10: 孩子端登出 → 清除 token，跳回登录页', async ({ page }) => {
    const state = readTestState()
    const childLogin = await loginViaApi(state.child.phone, state.child.password)
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)

    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="btn-logout"]')).toBeVisible({ timeout: 8000 })
    await page.locator('[data-testid="btn-logout"]').click()

    // Taro.showModal 渲染为自定义弹窗，点击「确定」确认登出
    await page.getByText('确定').click()

    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('login')

    // 验证 localStorage 已清除
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
  })

  test('TC-AUTH-11: 家长端登出 → 清除 token，跳回登录页', async ({ page }) => {
    const state = readTestState()
    const parentLogin = await loginViaApi(state.parent.phone, state.parent.password)
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)

    await page.goto('/#/pages/parent/home/index')
    await expect(page.locator('[data-testid="btn-logout"]')).toBeVisible({ timeout: 8000 })
    await page.locator('[data-testid="btn-logout"]').click()

    await page.getByText('确定').click()

    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('login')

    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
  })

  test('TC-AUTH-12: 取消登出确认 → 停留在当前页', async ({ page }) => {
    const state = readTestState()
    const childLogin = await loginViaApi(state.child.phone, state.child.password)
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)

    await page.goto('/#/pages/child/tasks/index')
    await page.locator('[data-testid="btn-logout"]').click()

    // 点「取消」
    await page.getByText('取消').click()

    // 应留在任务页
    await page.waitForTimeout(500)
    expect(page.url()).toContain('child/tasks')
  })

})
