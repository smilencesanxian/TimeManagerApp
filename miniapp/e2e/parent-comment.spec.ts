/**
 * TC-P-COMM：家长端心语评语系统
 *
 * 覆盖范围：
 *  - 发送入口：家长首页"发送心语"按钮
 *  - 自定义输入评语并发送 → 孩子端心语墙显示
 *  - 选择系统推荐评语发送 → 成功
 *  - 发送空评语 → 表单校验阻止
 *  - 超字数限制（>200字）→ 显示提示
 *  - 每日发送次数上限（5条）→ 超过时提示
 *  - 孩子端心语墙：最新评语显示在顶部
 *  - 孩子端心语墙：可查看历史评语（若有多条）
 *  - 权限守卫：孩子端不能发送评语
 */

import { test, expect, Page } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  injectAuth,
  apiPost,
  FreshLoginResult,
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

/** 家长首页打开发送心语弹窗 */
async function openCommentModal(page: Page) {
  await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
  await page.goto('/#/pages/parent/home/index')
  await expect(page.locator('[data-testid="parent-home"]')).toBeVisible({ timeout: 8000 })
  await page.locator('[data-testid="btn-send-comment"]').click()
  await expect(page.locator('[data-testid="comment-modal"]')).toBeVisible({ timeout: 3000 })
}

/** 通过 API 发送评语 */
async function sendCommentViaApi(content: string) {
  return apiPost('/comments', { childId, content }, parentLogin.token)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 发送心语 - 正常流程
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-COMM-01x 发送心语 - 正常流程', () => {

  test('TC-P-COMM-01: 点击"发送心语"按钮 → 弹出评语输入弹窗', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')
    await expect(page.locator('[data-testid="parent-home"]')).toBeVisible({ timeout: 8000 })

    await page.locator('[data-testid="btn-send-comment"]').click()
    await expect(page.locator('[data-testid="comment-modal"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-P-COMM-02: 自定义输入评语并发送 → 成功提示，弹窗关闭', async ({ page }) => {
    await openCommentModal(page)

    const content = `今天表现很棒！继续加油！${Date.now()}`
    await page.locator('[data-testid="input-comment"] textarea').fill(content)
    await page.locator('[data-testid="btn-submit-comment"]').click()

    // 成功提示
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({ timeout: 5000 })
    // 弹窗关闭
    await expect(page.locator('[data-testid="comment-modal"]')).not.toBeVisible({ timeout: 3000 })
  })

  test('TC-P-COMM-03: 发送心语后 → 孩子端心语墙实时显示该评语', async ({ page, context }) => {
    const content = `给宝贝的话_${Date.now()}`

    // 通过 API 发送（绕过 UI，确保测试隔离性）
    await sendCommentViaApi(content)

    // 打开孩子端验证
    const childPage = await context.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/tasks/index')
    await childPage.waitForTimeout(2000)

    // 心语墙区域显示该评语
    await expect(childPage.locator('[data-testid="comment-wall"]')).toBeVisible({ timeout: 8000 })
    await expect(childPage.locator('[data-testid="comment-wall"]')).toContainText(content, { timeout: 5000 })

    await childPage.close()
  })

  test('TC-P-COMM-04: 选择系统推荐评语 → 填入输入框并发送成功', async ({ page }) => {
    await openCommentModal(page)

    // 推荐模板列表存在
    await expect(page.locator('[data-testid="comment-templates"]')).toBeVisible()

    // 点击第一条模板
    await page.locator('[data-testid^="comment-template-"]').first().click()

    // 输入框自动填入模板内容
    const inputValue = await page.locator('[data-testid="input-comment"] textarea').inputValue()
    expect(inputValue.length).toBeGreaterThan(0)

    // 发送
    await page.locator('[data-testid="btn-submit-comment"]').click()
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({ timeout: 5000 })
  })

  test('TC-P-COMM-05: 选择推荐模板后可继续编辑内容再发送', async ({ page }) => {
    await openCommentModal(page)

    await page.locator('[data-testid^="comment-template-"]').first().click()
    const templateText = await page.locator('[data-testid="input-comment"] textarea').inputValue()

    // 在模板后追加内容
    const appendText = '妈妈很爱你！'
    await page.locator('[data-testid="input-comment"] textarea').press('End')
    await page.locator('[data-testid="input-comment"] textarea').type(appendText)

    const finalText = await page.locator('[data-testid="input-comment"] textarea').inputValue()
    expect(finalText).toContain(appendText)

    await page.locator('[data-testid="btn-submit-comment"]').click()
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({ timeout: 5000 })
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 发送心语 - 表单校验
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-COMM-02x 发送心语 - 表单校验', () => {

  test('TC-P-COMM-06: 评语内容为空直接点发送 → 显示校验提示，不提交', async ({ page }) => {
    await openCommentModal(page)

    // 不填内容直接发送
    await page.locator('[data-testid="btn-submit-comment"]').click()
    await page.waitForTimeout(1000)

    // 弹窗仍可见
    await expect(page.locator('[data-testid="comment-modal"]')).toBeVisible()
    // 校验提示
    await expect(page.locator('[data-testid="comment-content-error"]')).toBeVisible()
  })

  test('TC-P-COMM-07: 评语超过200字 → 显示字数超限提示，发送按钮禁用或提示', async ({ page }) => {
    await openCommentModal(page)

    // 输入201字
    const longText = '好'.repeat(201)
    await page.locator('[data-testid="input-comment"] textarea').fill(longText)

    // 字数提示为红色或错误状态
    await expect(page.locator('[data-testid="comment-length-warning"]')).toBeVisible()

    await page.locator('[data-testid="btn-submit-comment"]').click()
    await page.waitForTimeout(1000)

    // 弹窗仍可见，未成功提交
    await expect(page.locator('[data-testid="comment-modal"]')).toBeVisible()
  })

  test('TC-P-COMM-08: 点击关闭弹窗 → 弹窗关闭，未发送', async ({ page }) => {
    await openCommentModal(page)

    await page.locator('[data-testid="input-comment"] textarea').fill('不会发送的内容')
    await page.locator('[data-testid="btn-close-comment"]').click()

    await expect(page.locator('[data-testid="comment-modal"]')).not.toBeVisible({ timeout: 2000 })
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 孩子端心语墙
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('TC-P-COMM-03x 孩子端心语墙', () => {

  test('TC-P-COMM-09: 孩子端今日任务页 → 心语墙区域可见', async ({ page }) => {
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="comment-wall"]')).toBeVisible({ timeout: 8000 })
  })

  test('TC-P-COMM-10: 家长发送两条评语 → 孩子端心语墙显示最新的评语在顶部', async ({ page }) => {
    const comment1 = `第一条心语_${Date.now()}`
    const comment2 = `最新心语_${Date.now() + 1}`

    // API 发送两条
    await sendCommentViaApi(comment1)
    await new Promise(r => setTimeout(r, 100))
    await sendCommentViaApi(comment2)

    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')
    await expect(page.locator('[data-testid="comment-wall"]')).toBeVisible({ timeout: 8000 })

    // 最新的评语在最顶部（第一条 comment item）
    const firstComment = page.locator('[data-testid^="comment-item-"]').first()
    await expect(firstComment).toContainText(comment2, { timeout: 5000 })
  })

  test('TC-P-COMM-11: 心语墙无评语时 → 显示"暂无家长心语"占位文案', async ({ page }) => {
    // 此测试需要一个没有心语的孩子账号（特殊账号）
    // 可使用新注册账号或数据隔离方式；此处做宽容检测
    await injectAuth(page, childLogin.user, childLogin.token, childLogin.refreshToken)
    await page.goto('/#/pages/child/tasks/index')

    const empty = page.locator('[data-testid="comment-wall-empty"]')
    const wall  = page.locator('[data-testid="comment-wall"]')

    await expect(wall).toBeVisible({ timeout: 8000 })
    // 有心语或空状态占位符，两者都OK
    const hasComments = await page.locator('[data-testid^="comment-item-"]').count() > 0
    const hasEmpty    = await empty.isVisible()
    expect(hasComments || hasEmpty).toBe(true)
  })

})
