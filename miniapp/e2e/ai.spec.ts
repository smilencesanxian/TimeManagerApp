/**
 * Phase 5 E2E 测试：AI集成（DashScope）
 *
 * 覆盖三大功能模块：
 *   TC-AI-PARSE   — AI任务解析（家长快速添加任务时的自然语言识别）
 *   TC-AI-COMMENT — AI评语推荐（孩子完成任务后推荐评语 + 发送心语）
 *   TC-AI-SUMMARY — AI每日总结（今日完成情况汇总推送）
 *   TC-AI-REPORT  — AI周报（周末闪光点分析 + 星星评比）
 *
 * 测试策略：
 *   - 正常路径：验证AI功能核心流程端到端可用
 *   - 降级路径：模拟AI服务失败（page.route拦截），验证降级不阻断主流程
 *   - 边界条件：输入校验、字数限制、空数据处理
 *   - 跨端联动：家长端AI操作 → 孩子端实时可见
 *
 * 前置条件：
 *   - backend 运行在 http://localhost:3000
 *   - miniapp H5 运行在 http://localhost:10086
 *   - global-setup 已完成（parent + child 账号就绪并绑定）
 *   - backend .env 中 DASHSCOPE_API_KEY 已配置（真实key，用于正常路径测试）
 */

import { test, expect } from '@playwright/test'
import {
  readTestState,
  loginViaApi,
  createFreshTask,
  apiPost,
  apiGet,
  apiDelete,
  injectAuth,
  FreshLoginResult,
  CreatedTask,
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
// TC-AI-PARSE  AI任务解析——家长快速添加任务
// 场景：家长在首页点击"+ 添加今日任务"，输入自然语言描述
//       AI实时识别：学科、任务类型、预估时长
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-AI-PARSE 家长端AI任务解析', () => {

  // ─── TC-AI-PARSE-01：标准数学描述 → AI正确识别学科和时长 ────

  test('TC-AI-PARSE-01: 输入"数学口算20道题" → AI识别学科=数学，显示预估时长', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    // 点击快速添加任务入口
    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    // 输入任务描述
    await page.locator('[data-testid="input-task-desc"] input').fill('数学口算20道题')

    // AI识别结果区域出现（loading结束后）
    await expect(page.locator('[data-testid="ai-parse-result"]')).toBeVisible({ timeout: 10000 })

    // 识别出的学科为"数学"
    await expect(page.locator('[data-testid="ai-subject-tag"]')).toContainText('数学')

    // 预估时长显示（大于0的数值+分钟）
    const durationText = await page.locator('[data-testid="ai-estimated-duration"]').textContent()
    expect(durationText).toMatch(/\d+\s*分钟/)
  })

  // ─── TC-AI-PARSE-02：语文描述 → AI识别学科=语文 ────────────

  test('TC-AI-PARSE-02: 输入"背语文课文第三段" → AI识别学科=语文', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="input-task-desc"] input').fill('背语文课文第三段')
    await expect(page.locator('[data-testid="ai-parse-result"]')).toBeVisible({ timeout: 10000 })

    await expect(page.locator('[data-testid="ai-subject-tag"]')).toContainText('语文')
  })

  // ─── TC-AI-PARSE-03：英语描述 → AI识别学科=英语 ────────────

  test('TC-AI-PARSE-03: 输入"listen to English recordings 30 mins" → AI识别学科=英语', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="input-task-desc"] input').fill('listen to English recordings 30 mins')
    await expect(page.locator('[data-testid="ai-parse-result"]')).toBeVisible({ timeout: 10000 })

    await expect(page.locator('[data-testid="ai-subject-tag"]')).toContainText('英语')
  })

  // ─── TC-AI-PARSE-04：家长修改AI预估时长 → 保存时使用修改后的值 ──

  test('TC-AI-PARSE-04: AI识别后家长手动修改预估时长 → 任务以修改后时长保存', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="input-task-desc"] input').fill('数学练习册第10页')
    await expect(page.locator('[data-testid="ai-parse-result"]')).toBeVisible({ timeout: 10000 })

    // 修改AI建议的预估时长为40分钟
    const durationInput = page.locator('[data-testid="input-task-duration"] input')
    await durationInput.fill('')
    await durationInput.fill('40')

    // 添加任务
    await page.locator('[data-testid="btn-confirm-add-task"]').click()

    // 任务出现在家长首页任务列表
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible({ timeout: 5000 })
    const taskItem = page.locator('[data-testid="task-list"] [data-testid^="task-item-"]').last()
    // 任务时长显示40分钟
    await expect(taskItem.locator('[data-testid="task-duration"]')).toContainText('40')
  })

  // ─── TC-AI-PARSE-05：AI解析完成后确认添加 → 任务出现在孩子端 ──

  test('TC-AI-PARSE-05: AI解析后确认添加任务 → 孩子端今日任务列表实时出现该任务', async ({ page, browser }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    const taskDesc = `E2E英语听写_${Date.now()}`
    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="input-task-desc"] input').fill(taskDesc)
    await expect(page.locator('[data-testid="ai-parse-result"]')).toBeVisible({ timeout: 10000 })
    await page.locator('[data-testid="btn-confirm-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).not.toBeVisible({ timeout: 3000 })

    // 切换到孩子端验证任务同步
    const childContext = await browser.newContext()
    const childPage = await childContext.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/tasks/index')
    await expect(childPage.locator('[data-testid="task-list"]')).toBeVisible({ timeout: 8000 })

    // 孩子端出现家长刚添加的任务（通过描述文字匹配）
    await expect(childPage.locator(`text=${taskDesc}`)).toBeVisible({ timeout: 5000 })

    await childContext.close()
  })

  // ─── TC-AI-PARSE-06：AI服务超时（拦截模拟）→ 降级显示，可手动填写 ──

  test('TC-AI-PARSE-06: AI服务超时 → 显示降级提示，家长仍可手动选择学科和时长完成添加', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    // 拦截AI解析接口，模拟超时（延迟15秒 > 客户端超时阈值）
    await page.route('**/ai/parse-task', (route) =>
      new Promise(() => {
        // 永不resolve，模拟超时
        setTimeout(() => route.abort(), 15000)
      })
    )

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="input-task-desc"] input').fill('数学计算题一页')

    // 等待AI识别超时提示（客户端应在5-8秒内判定超时）
    await expect(page.locator('[data-testid="ai-parse-fallback"]')).toBeVisible({ timeout: 12000 })
    // 降级提示包含手动选择引导文案
    await expect(page.locator('[data-testid="ai-parse-fallback"]')).toContainText('请手动选择')

    // 手动填写学科（点击"数学"标签）
    await page.locator('[data-testid="subject-option-数学"]').click()
    // 手动填写时长
    await page.locator('[data-testid="input-task-duration"] input').fill('30')

    // 仍然可以添加任务
    await page.locator('[data-testid="btn-confirm-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).not.toBeVisible({ timeout: 3000 })
  })

  // ─── TC-AI-PARSE-07：AI识别失败（500）→ 降级，不阻断流程 ──────

  test('TC-AI-PARSE-07: AI服务返回500 → 降级提示，不阻断任务添加', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    // 拦截AI接口返回500
    await page.route('**/ai/parse-task', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'AI service unavailable' }),
      })
    )

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })
    await page.locator('[data-testid="input-task-desc"] input').fill('语文默写生字10个')

    // 降级提示出现（不崩溃）
    await expect(page.locator('[data-testid="ai-parse-fallback"]')).toBeVisible({ timeout: 5000 })

    // 手动选择学科后仍可提交
    await page.locator('[data-testid="subject-option-语文"]').click()
    await page.locator('[data-testid="input-task-duration"] input').fill('20')
    await page.locator('[data-testid="btn-confirm-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).not.toBeVisible({ timeout: 3000 })
  })

  // ─── TC-AI-PARSE-08：空输入时点击添加 → 前端校验阻止提交 ────────

  test('TC-AI-PARSE-08: 任务描述为空时提交 → 校验提示，弹窗不关闭', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    // 不填写任何内容，直接点击确认
    await page.locator('[data-testid="btn-confirm-add-task"]').click()
    await page.waitForTimeout(500)

    // 弹窗仍然可见
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible()
    // 校验错误提示可见
    await expect(page.locator('[data-testid="task-desc-error"]')).toBeVisible()
  })

  // ─── TC-AI-PARSE-09：极长描述（>100字）→ 输入截断或提示 ───────

  test('TC-AI-PARSE-09: 超长任务描述（>100字） → 截断到限制长度或显示字数提示', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/home/index')

    await page.locator('[data-testid="btn-add-task"]').click()
    await expect(page.locator('[data-testid="quick-add-task-modal"]')).toBeVisible({ timeout: 5000 })

    const longDesc = '这是一段超过一百字的任务描述内容，用来测试前端是否对输入字数有正确限制。'.repeat(5)
    await page.locator('[data-testid="input-task-desc"] input').fill(longDesc)

    // 字数限制提示出现 或 输入框内容被截断（不超过100字）
    const actualText = await page.locator('[data-testid="input-task-desc"] input').inputValue()
    const hasLengthWarning = await page.locator('[data-testid="task-desc-length-warning"]').isVisible()
    expect(actualText.length <= 100 || hasLengthWarning).toBe(true)
  })

})

// ═══════════════════════════════════════════════════════════════════
// TC-AI-COMMENT  AI评语推荐——家长发送心语
// 场景：孩子完成任务后，家长端收到AI推荐评语，选择发送到孩子心语墙
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-AI-COMMENT 家长端AI评语推荐', () => {

  let completedTask: CreatedTask

  test.beforeEach(async () => {
    // 创建一个任务并将状态改为已完成，为评语推荐触发做准备
    completedTask = await createFreshTask(parentLogin.token, childId)
    // 通过API标记任务为已完成
    await apiPost(
      `/tasks/${completedTask.id}/status`,
      { status: 'completed' },
      parentLogin.token
    )
  })

  test.afterEach(async () => {
    await apiDelete(`/tasks/${completedTask.id}`, parentLogin.token)
  })

  // ─── TC-AI-COMMENT-01：进入评语推荐页 → AI推荐评语列表可见 ──────

  test('TC-AI-COMMENT-01: 家长进入发送心语页 → 显示AI推荐的3条及以上评语选项', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    // AI推荐评语加载完成
    await expect(page.locator('[data-testid="ai-comment-suggestions"]')).toBeVisible({ timeout: 10000 })

    // 至少3条推荐评语
    const suggestions = page.locator('[data-testid^="comment-suggestion-"]')
    const count = await suggestions.count()
    expect(count).toBeGreaterThanOrEqual(3)

    // 每条评语有正向/鼓励性的文字内容（非空）
    for (let i = 0; i < count; i++) {
      const text = await suggestions.nth(i).textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  // ─── TC-AI-COMMENT-02：选择推荐评语发送 → 孩子端心语墙实时出现 ──

  test('TC-AI-COMMENT-02: 家长选择AI推荐评语并发送 → 孩子端心语墙立即可见该评语', async ({ page, browser }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    await expect(page.locator('[data-testid="ai-comment-suggestions"]')).toBeVisible({ timeout: 10000 })

    // 点击第一条推荐评语选中它
    await page.locator('[data-testid="comment-suggestion-0"]').click()
    await expect(page.locator('[data-testid="comment-suggestion-0"]')).toHaveClass(/selected|active/)

    // 获取选中的评语文本（用于后续孩子端验证）
    const selectedText = await page.locator('[data-testid="comment-suggestion-0"]').textContent() ?? ''

    // 点击发送
    await page.locator('[data-testid="btn-send-comment"]').click()
    // 发送成功提示
    await expect(page.locator('[data-testid="send-comment-success-toast"]')).toBeVisible({ timeout: 3000 })

    // 孩子端验证：心语墙出现该评语
    const childContext = await browser.newContext()
    const childPage = await childContext.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/message/index')
    await expect(childPage.locator('[data-testid="message-wall"]')).toBeVisible({ timeout: 8000 })
    await expect(childPage.locator('[data-testid="message-wall"]')).toContainText(selectedText.trim(), { timeout: 5000 })

    await childContext.close()
  })

  // ─── TC-AI-COMMENT-03：修改推荐评语后发送 → 孩子端收到修改后内容 ──

  test('TC-AI-COMMENT-03: 家长修改推荐评语后发送 → 孩子端收到修改后内容', async ({ page, browser }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    await expect(page.locator('[data-testid="ai-comment-suggestions"]')).toBeVisible({ timeout: 10000 })

    // 选中第一条推荐评语
    await page.locator('[data-testid="comment-suggestion-0"]').click()

    // 在编辑框里修改内容
    const customComment = `修改后的评语_${Date.now()}`
    const commentInput = page.locator('[data-testid="input-comment-text"]')
    await commentInput.fill('')
    await commentInput.fill(customComment)

    await page.locator('[data-testid="btn-send-comment"]').click()
    await expect(page.locator('[data-testid="send-comment-success-toast"]')).toBeVisible({ timeout: 3000 })

    // 孩子端验证
    const childContext = await browser.newContext()
    const childPage = await childContext.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/message/index')
    await expect(childPage.locator('[data-testid="message-wall"]')).toContainText(customComment, { timeout: 8000 })

    await childContext.close()
  })

  // ─── TC-AI-COMMENT-04：自定义输入评语（不使用推荐）→ 发送成功 ───

  test('TC-AI-COMMENT-04: 家长自定义输入评语，不选任何推荐 → 发送成功，孩子端可见', async ({ page, browser }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    // 直接在输入框输入（不点击推荐）
    const customComment = `完全自定义的评语_${Date.now()}`
    const commentInput = page.locator('[data-testid="input-comment-text"]')
    await commentInput.fill(customComment)

    await page.locator('[data-testid="btn-send-comment"]').click()
    await expect(page.locator('[data-testid="send-comment-success-toast"]')).toBeVisible({ timeout: 3000 })

    // 孩子端验证
    const childContext = await browser.newContext()
    const childPage = await childContext.newPage()
    await injectAuth(childPage, childLogin.user, childLogin.token, childLogin.refreshToken)
    await childPage.goto('/#/pages/child/message/index')
    await expect(childPage.locator('[data-testid="message-wall"]')).toContainText(customComment, { timeout: 8000 })

    await childContext.close()
  })

  // ─── TC-AI-COMMENT-05：AI推荐接口失败 → 降级显示默认推荐词 ────

  test('TC-AI-COMMENT-05: AI评语推荐接口失败 → 降级显示默认推荐词，不影响发送流程', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    // 拦截AI推荐接口返回500
    await page.route('**/ai/suggest-comments', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'AI unavailable' }),
      })
    )

    // 降级后仍有推荐词显示（硬编码的保底推荐）
    await expect(page.locator('[data-testid="ai-comment-suggestions"]')).toBeVisible({ timeout: 5000 })
    const suggestions = page.locator('[data-testid^="comment-suggestion-"]')
    const count = await suggestions.count()
    expect(count).toBeGreaterThanOrEqual(1)  // 至少有1条降级保底推荐

    // 选择后仍然可以发送
    await suggestions.first().click()
    await page.locator('[data-testid="btn-send-comment"]').click()
    await expect(page.locator('[data-testid="send-comment-success-toast"]')).toBeVisible({ timeout: 3000 })
  })

  // ─── TC-AI-COMMENT-06：评语超字数限制 → 提示，禁止发送 ─────────

  test('TC-AI-COMMENT-06: 评语内容超过200字限制 → 字数提示变红，发送按钮禁用', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    // 输入超过200字的内容
    const overLengthText = '超出字数限制的评语内容'.repeat(25)  // ~225字
    const commentInput = page.locator('[data-testid="input-comment-text"]')
    await commentInput.fill(overLengthText)

    // 字数计数器提示超出
    await expect(page.locator('[data-testid="comment-length-counter"]')).toHaveClass(/error|over-limit/)

    // 发送按钮处于禁用状态
    await expect(page.locator('[data-testid="btn-send-comment"]')).toBeDisabled()
  })

  // ─── TC-AI-COMMENT-07：空评语提交 → 前端阻止 ────────────────────

  test('TC-AI-COMMENT-07: 评语内容为空时点击发送 → 校验提示，不发送', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/comment/index')

    // 确保输入框为空（清空任何预填内容）
    const commentInput = page.locator('[data-testid="input-comment-text"]')
    await commentInput.fill('')

    await page.locator('[data-testid="btn-send-comment"]').click()
    await page.waitForTimeout(500)

    // 校验提示出现
    await expect(page.locator('[data-testid="comment-empty-error"]')).toBeVisible()
  })

})

// ═══════════════════════════════════════════════════════════════════
// TC-AI-SUMMARY  AI每日总结
// 场景：孩子完成所有任务后，AI生成当日学习总结推送给家长
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-AI-SUMMARY AI每日总结', () => {

  // ─── TC-AI-SUMMARY-01：调用每日总结API → 返回合法数据结构 ───────

  test('TC-AI-SUMMARY-01: 调用每日总结接口 → 返回含完成率/番茄数/专注时长的总结', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const res = await apiGet(
      `/ai/daily-summary?date=${today}&childId=${childId}`,
      parentLogin.token
    ) as {
      code: number
      data: {
        date: string
        completionRate: number
        pomodoroCount: number
        focusDuration: number
        summary: string
        encouragements: string[]
      }
    }

    expect(res.code).toBe(200)
    expect(typeof res.data.completionRate).toBe('number')
    expect(typeof res.data.pomodoroCount).toBe('number')
    expect(typeof res.data.focusDuration).toBe('number')
    // AI总结文本非空
    expect(res.data.summary.length).toBeGreaterThan(0)
    // 鼓励评语数组至少1条
    expect(res.data.encouragements.length).toBeGreaterThanOrEqual(1)
  })

  // ─── TC-AI-SUMMARY-02：家长端查看每日总结页 → 关键数据展示正确 ──

  test('TC-AI-SUMMARY-02: 家长端访问每日总结页 → 完成率/专注时长/AI点评均显示', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/daily/index')

    // 总结页核心区域可见
    await expect(page.locator('[data-testid="daily-summary-card"]')).toBeVisible({ timeout: 10000 })

    // 完成率数值展示
    await expect(page.locator('[data-testid="summary-completion-rate"]')).toBeVisible()
    const rateText = await page.locator('[data-testid="summary-completion-rate"]').textContent()
    expect(rateText).toMatch(/\d+%/)

    // AI点评文字展示（非空）
    await expect(page.locator('[data-testid="summary-ai-text"]')).toBeVisible()
    const summaryText = await page.locator('[data-testid="summary-ai-text"]').textContent()
    expect(summaryText?.trim().length).toBeGreaterThan(0)

    // 每日推荐评语区域展示（家长可选发送）
    await expect(page.locator('[data-testid="summary-encouragements"]')).toBeVisible()
  })

  // ─── TC-AI-SUMMARY-03：今日无任务完成 → 总结显示"暂无记录" ────────

  test('TC-AI-SUMMARY-03: 今日没有任务完成记录 → 总结页显示"今日暂无学习记录"', async ({ page }) => {
    // 使用一个全新的孩子账号（无任务数据）进行测试
    // 实际实现中可通过新注册账号或mock来隔离，这里通过过滤日期验证
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)

    // 访问一个历史无记录的日期
    const pastDate = '2020-01-01'
    await page.goto(`/#/pages/parent/summary/daily/index?date=${pastDate}`)

    await expect(page.locator('[data-testid="daily-summary-card"]')).toBeVisible({ timeout: 10000 })

    // 显示空数据引导文案
    await expect(page.locator('[data-testid="summary-empty-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="summary-empty-state"]')).toContainText('暂无')
  })

  // ─── TC-AI-SUMMARY-04：AI总结接口失败 → 降级展示基础统计数据 ────

  test('TC-AI-SUMMARY-04: AI总结服务失败 → 降级展示数字统计，不显示白屏', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/daily/index')

    // 拦截AI总结接口
    await page.route('**/ai/daily-summary**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'AI unavailable' }),
      })
    )

    await page.reload()

    // 页面不显示白屏或崩溃错误
    await expect(page.locator('[data-testid="daily-summary-card"]')).toBeVisible({ timeout: 5000 })

    // 基础统计数据（从非AI接口获取）仍然显示
    await expect(page.locator('[data-testid="summary-completion-rate"]')).toBeVisible()
  })

})

// ═══════════════════════════════════════════════════════════════════
// TC-AI-REPORT  AI周报
// 场景：周末自动/手动触发，AI生成本周数据分析报告和闪光点
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-AI-REPORT AI周报', () => {

  // ─── TC-AI-REPORT-01：调用周报API → 返回合法数据结构 ────────────

  test('TC-AI-REPORT-01: 调用周报接口 → 返回含完成率/番茄数/闪光点/星星奖励的报告', async () => {
    // 取当前周的起始日期
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const weekStart = monday.toISOString().slice(0, 10)

    const res = await apiGet(
      `/ai/weekly-report?weekStart=${weekStart}&childId=${childId}`,
      parentLogin.token
    ) as {
      code: number
      data: {
        weekStart: string
        weekEnd: string
        taskCompletionRate: number
        habitCompletionRate: number
        totalPomodoros: number
        totalFocusDuration: number
        highlights: string[]
        starRewards: {
          habitReached: number
          habitPerfect: number
          taskReached: number
          taskPerfect: number
          focusMaster: number
          fullAttendance: number
          total: number
        }
        aiAnalysis: string
      }
    }

    expect(res.code).toBe(200)
    expect(typeof res.data.taskCompletionRate).toBe('number')
    expect(typeof res.data.habitCompletionRate).toBe('number')
    expect(typeof res.data.totalPomodoros).toBe('number')
    // 星星奖励总数为各项之和
    const { habitReached, habitPerfect, taskReached, taskPerfect, focusMaster, fullAttendance, total } = res.data.starRewards
    expect(total).toBe(habitReached + habitPerfect + taskReached + taskPerfect + focusMaster + fullAttendance)
    // AI分析文字非空
    expect(res.data.aiAnalysis.length).toBeGreaterThan(0)
  })

  // ─── TC-AI-REPORT-02：家长端查看周报页 → 完整报告内容展示 ──────

  test('TC-AI-REPORT-02: 家长端访问周报页 → 任务完成率/习惯达标/闪光点/星星奖励均显示', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/weekly/index')

    // 周报卡片可见
    await expect(page.locator('[data-testid="weekly-report-card"]')).toBeVisible({ timeout: 10000 })

    // 任务完成率显示
    await expect(page.locator('[data-testid="report-task-rate"]')).toBeVisible()
    // 习惯达标率显示
    await expect(page.locator('[data-testid="report-habit-rate"]')).toBeVisible()
    // 本周星星奖励汇总显示
    await expect(page.locator('[data-testid="report-star-rewards"]')).toBeVisible()
    // AI闪光点区域显示
    await expect(page.locator('[data-testid="report-highlights"]')).toBeVisible()
    // AI分析文字非空
    const analysisText = await page.locator('[data-testid="report-ai-analysis"]').textContent()
    expect(analysisText?.trim().length).toBeGreaterThan(0)
  })

  // ─── TC-AI-REPORT-03：星星奖励明细分项展示 → 各维度条件标注清晰 ──

  test('TC-AI-REPORT-03: 周报星星奖励明细 → 习惯/任务/专注/全勤各分项均显示', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/weekly/index')
    await expect(page.locator('[data-testid="weekly-report-card"]')).toBeVisible({ timeout: 10000 })

    // 点击展开星星奖励明细（如果是折叠的）
    const detailToggle = page.locator('[data-testid="btn-toggle-star-detail"]')
    if (await detailToggle.isVisible()) {
      await detailToggle.click()
    }

    // 各维度奖励条目可见
    await expect(page.locator('[data-testid="star-detail-habit-reached"]')).toBeVisible()
    await expect(page.locator('[data-testid="star-detail-task-reached"]')).toBeVisible()
    await expect(page.locator('[data-testid="star-detail-focus-master"]')).toBeVisible()
    await expect(page.locator('[data-testid="star-detail-full-attendance"]')).toBeVisible()
  })

  // ─── TC-AI-REPORT-04：本周无数据 → 周报显示空状态引导 ───────────

  test('TC-AI-REPORT-04: 历史无记录的周 → 周报显示"本周暂无学习记录"', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)

    // 访问一个历史无数据的周
    await page.goto('/#/pages/parent/summary/weekly/index?weekStart=2020-01-06')

    await expect(page.locator('[data-testid="weekly-report-card"]')).toBeVisible({ timeout: 10000 })

    // 空状态引导文案
    await expect(page.locator('[data-testid="report-empty-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="report-empty-state"]')).toContainText('暂无')
  })

  // ─── TC-AI-REPORT-05：AI周报接口失败 → 降级展示纯数字统计 ──────

  test('TC-AI-REPORT-05: AI周报服务失败 → 降级展示数字统计，页面不崩溃', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/weekly/index')

    // 拦截AI周报接口
    await page.route('**/ai/weekly-report**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 500, message: 'AI unavailable' }),
      })
    )

    await page.reload()

    // 页面不白屏、不崩溃
    await expect(page.locator('[data-testid="weekly-report-card"]')).toBeVisible({ timeout: 5000 })
    // 基础数字统计（非AI来源）仍然展示
    await expect(page.locator('[data-testid="report-task-rate"]')).toBeVisible()
    await expect(page.locator('[data-testid="report-star-rewards"]')).toBeVisible()
  })

  // ─── TC-AI-REPORT-06：上下周切换 → 数据随周切换更新 ────────────

  test('TC-AI-REPORT-06: 点击"上一周"按钮 → 页面切换到上周数据，标题日期更新', async ({ page }) => {
    await injectAuth(page, parentLogin.user, parentLogin.token, parentLogin.refreshToken)
    await page.goto('/#/pages/parent/summary/weekly/index')
    await expect(page.locator('[data-testid="weekly-report-card"]')).toBeVisible({ timeout: 10000 })

    // 获取当前显示的周标题
    const currentWeekTitle = await page.locator('[data-testid="report-week-title"]').textContent()

    // 点击上一周
    await page.locator('[data-testid="btn-prev-week"]').click()
    await page.waitForTimeout(1000)

    // 周标题已更新（不同于之前的周）
    const prevWeekTitle = await page.locator('[data-testid="report-week-title"]').textContent()
    expect(prevWeekTitle).not.toBe(currentWeekTitle)
  })

})

// ═══════════════════════════════════════════════════════════════════
// TC-AI-BACKEND  后端AI接口冒烟测试（纯API层验证）
// 无需浏览器，直接调用后端接口，验证AI服务集成正确性
// ═══════════════════════════════════════════════════════════════════

test.describe('TC-AI-BACKEND 后端AI接口', () => {

  // ─── TC-AI-BACKEND-01：任务解析接口基本可用 ──────────────────────

  test('TC-AI-BACKEND-01: POST /ai/parse-task 接口 → 返回学科和预估时长', async () => {
    const res = await apiPost(
      '/ai/parse-task',
      { description: '数学练习题第5页共20题' },
      parentLogin.token
    ) as {
      code: number
      data: {
        subject: string
        estimatedDuration: number
        taskType: string
        confidence: number
      }
    }

    expect(res.code).toBe(200)
    expect(typeof res.data.subject).toBe('string')
    expect(res.data.subject.length).toBeGreaterThan(0)
    expect(typeof res.data.estimatedDuration).toBe('number')
    expect(res.data.estimatedDuration).toBeGreaterThan(0)
  })

  // ─── TC-AI-BACKEND-02：任务解析接口权限保护 → 未登录返回401 ──────

  test('TC-AI-BACKEND-02: 未携带token访问AI解析接口 → 返回401', async () => {
    const res = await apiPost(
      '/ai/parse-task',
      { description: '数学口算' }
      // 不传token
    ) as { code: number }

    expect(res.code).toBe(401)
  })

  // ─── TC-AI-BACKEND-03：评语推荐接口 → 返回多条鼓励性评语 ──────────

  test('TC-AI-BACKEND-03: POST /ai/suggest-comments 接口 → 返回≥3条评语', async () => {
    const res = await apiPost(
      '/ai/suggest-comments',
      {
        childId,
        completionRate: 0.9,
        pomodoroCount: 4,
        focusDuration: 100,
      },
      parentLogin.token
    ) as {
      code: number
      data: { suggestions: string[] }
    }

    expect(res.code).toBe(200)
    expect(Array.isArray(res.data.suggestions)).toBe(true)
    expect(res.data.suggestions.length).toBeGreaterThanOrEqual(3)
    // 每条评语非空
    res.data.suggestions.forEach((s) => {
      expect(s.trim().length).toBeGreaterThan(0)
    })
  })

  // ─── TC-AI-BACKEND-04：评语推荐 → 家长只能查询自己孩子的数据 ──────

  test('TC-AI-BACKEND-04: 家长请求其他家庭孩子的评语推荐 → 返回403或404', async () => {
    const fakeChildId = '00000000-0000-0000-0000-000000000000'
    const res = await apiPost(
      '/ai/suggest-comments',
      {
        childId: fakeChildId,
        completionRate: 0.8,
        pomodoroCount: 3,
        focusDuration: 75,
      },
      parentLogin.token
    ) as { code: number }

    expect([403, 404]).toContain(res.code)
  })

  // ─── TC-AI-BACKEND-05：解析接口对空描述返回400 ────────────────────

  test('TC-AI-BACKEND-05: POST /ai/parse-task 空描述 → 返回400参数错误', async () => {
    const res = await apiPost(
      '/ai/parse-task',
      { description: '' },
      parentLogin.token
    ) as { code: number }

    expect(res.code).toBe(400)
  })

})
