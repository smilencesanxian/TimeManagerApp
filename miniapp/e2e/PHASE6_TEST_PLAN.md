# Phase 6 E2E 测试用例清单

> 测试框架：Playwright
> 执行命令：`cd miniapp && npx playwright test e2e/parent-*.spec.ts`

---

## 测试文件索引

| 文件 | 模块 | 用例数 |
|------|------|--------|
| `parent-home.spec.ts` | 家长首页看板 | 20 |
| `parent-task.spec.ts` | 任务创建 & 编辑 | 13 |
| `parent-plan.spec.ts` | 计划管理（3 Tab） | 21 |
| `parent-ranking.spec.ts` | 本周评比 | 13 |
| `parent-comment.spec.ts` | 心语评语 | 11 |
| `parent-profile.spec.ts` | 个人中心 & 设置 | 20 |
| **合计** | | **98 条** |

---

## 一、家长首页看板（parent-home.spec.ts）

### 基础展示
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-HOME-01 | 进入家长首页 | 统计卡片可见（已完成/总任务/专注时长） |
| TC-P-HOME-02 | 首页双列展示 | 计时任务区 + 打卡习惯区分别渲染 |
| TC-P-HOME-03 | 今日无任务 | 显示"暂无任务"引导文案 |
| TC-P-HOME-04 | 进行中任务高亮 | 任务卡片含"进行中"状态标签 |

### 快速添加任务
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-HOME-05 | 点击"+ 添加今日任务" | 弹出快速添加弹窗 |
| TC-P-HOME-06 | 填写名称+学科+时长提交 | 创建成功，任务出现在列表 |
| TC-P-HOME-07 | 未填名称提交 | 弹窗不关闭，显示校验提示 |
| TC-P-HOME-08 | 点击取消 | 弹窗关闭，任务数量不变 |
| TC-P-HOME-09 | 选择英语学科创建 | 任务卡片显示英语标签 |

### 任务操作
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-HOME-10 | 手动标记任务完成 | 任务卡片切换为"已完成"状态 |
| TC-P-HOME-11 | 删除任务 → 确认 | 任务从列表消失 |
| TC-P-HOME-12 | 删除任务 → 取消 | 任务保留 |
| TC-P-HOME-13 | 进行中任务编辑按钮 | 按钮 disabled |

### WebSocket 实时同步
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-HOME-14 | 孩子完成任务 → 家长端 | 统计数字实时+1 |
| TC-P-HOME-15 | 孩子开始任务 → 家长端 | 任务卡片实时变为"进行中" |

### 权限守卫 & 导航
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-HOME-16 | 未登录访问家长首页 | 跳转登录页 |
| TC-P-HOME-17 | 孩子账号访问家长首页 | 跳转登录/孩子任务页 |
| TC-P-HOME-18 | 点击底部"计划" Tab | 跳转计划管理页 |
| TC-P-HOME-19 | 点击底部"排行" Tab | 跳转本周评比页 |
| TC-P-HOME-20 | 点击底部"我的" Tab | 跳转个人中心页 |

---

## 二、任务创建 & 编辑（parent-task.spec.ts）

### 创建任务 - 正常流程
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-TASK-01 | 填写所有字段创建任务 | 成功跳回列表，任务可见 |
| TC-P-TASK-02 | 选择"语文"学科 | 显示绿色语文标签 |
| TC-P-TASK-03 | 选择"英语"学科 | 显示黄色英语标签 |
| TC-P-TASK-04 | 选择"其他"学科 | 显示紫色其他标签 |
| TC-P-TASK-05 | 创建任务后推送孩子端 | 孩子端今日任务页实时出现 |

### 创建任务 - 表单校验
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-TASK-06 | 未填名称提交 | 显示名称校验提示 |
| TC-P-TASK-07 | 未填时长提交 | 显示时长校验提示 |
| TC-P-TASK-08 | 名称超50字 | 显示字数限制提示 |
| TC-P-TASK-09 | 点击取消 | 返回上一页，不创建 |

### 编辑任务
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-TASK-10 | 进入编辑页 | 表单回显原有数据 |
| TC-P-TASK-11 | 修改名称保存 | 列表更新，后端同步 |
| TC-P-TASK-12 | 修改学科保存 | 后端学科字段更新 |
| TC-P-TASK-13 | 编辑进行中任务 | 系统阻止编辑 |

---

## 三、计划管理（parent-plan.spec.ts）

### Tab 切换
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PLAN-01 | 默认进入计划管理页 | "今日计划" Tab 激活 |
| TC-P-PLAN-02 | 点击"日历视图" Tab | 月历主体可见 |
| TC-P-PLAN-03 | 点击"场景模板" Tab | 模板列表可见 |
| TC-P-PLAN-04 | Tab 来回切换 | 内容区跟随变化 |

### 今日计划 Tab
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PLAN-05 | 今日计划展示任务列表 | 任务出现在列表 |
| TC-P-PLAN-06 | 今日计划展示习惯列表 | 习惯出现在列表 |
| TC-P-PLAN-07 | 点击"+ 添加任务" | 跳转创建页或弹出弹窗 |
| TC-P-PLAN-08 | 点击"+ 添加习惯" | 跳转习惯创建页 |

### 日历视图 Tab
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PLAN-09 | 显示当前月份标题 | 含当前年月 |
| TC-P-PLAN-10 | 渲染本月所有日期格子 | 格子数 ≥ 当月天数 |
| TC-P-PLAN-11 | 有任务的日期显示圆点 | 今日格子有 dot 指示 |
| TC-P-PLAN-12 | 点击日期 | 下方展示当日任务列表 |
| TC-P-PLAN-13 | 点击"上月"箭头 | 切换到上个月 |
| TC-P-PLAN-14 | 点击"下月"箭头 | 切换到下个月 |
| TC-P-PLAN-15 | 点击历史日期 | 仅展示，无编辑按钮 |
| TC-P-PLAN-16 | 点击未来日期 | 显示编辑/添加按钮 |

### 场景模板 Tab
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PLAN-17 | 展示4个系统模板卡片 | 日常/周末/寒暑假/考前均可见 |
| TC-P-PLAN-18 | 点击"日常学习"模板 | 展示预设任务列表 |
| TC-P-PLAN-19 | 应用模板到今天 | 成功提示，任务已生成 |
| TC-P-PLAN-20 | 取消应用模板 | 不生成任务，返回列表 |

### 权限守卫
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PLAN-21 | 未登录访问计划管理页 | 跳转登录页 |

---

## 四、本周评比（parent-ranking.spec.ts）

### 页面基础展示
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-RANK-01 | 显示本周日期范围标题 | 含年月信息 |
| TC-P-RANK-02 | 本周总评统计卡片 | 完成率/打卡率/专注时长可见 |
| TC-P-RANK-03 | 显示本周星星奖励数 | 非负整数 |
| TC-P-RANK-04 | 详细统计区域 | 各科目完成情况可见 |
| TC-P-RANK-05 | 习惯打卡记录（周历）| 7个日期格子 |

### 周切换
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-RANK-06 | 点击"上周"箭头 | 标题切换到上一周 |
| TC-P-RANK-07 | 上周→下周 | 回到本周标题 |
| TC-P-RANK-08 | 切换周后数据重新渲染 | 统计区域仍可见 |

### 星星奖励规则
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-RANK-09 | 评比维度列表 | 习惯达标/任务达标等维度可见 |
| TC-P-RANK-10 | 维度达标状态标签 | 已获得/未达标互斥显示 |

### 数据一致性 & 空状态
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-RANK-11 | 专注时长与后端 API 一致 | UI 值有效 |
| TC-P-RANK-12 | 本周无数据 | 显示"暂无数据"或0完成率 |
| TC-P-RANK-13 | 未登录访问排行页 | 跳转登录页 |

---

## 五、心语评语（parent-comment.spec.ts）

### 发送心语 - 正常流程
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-COMM-01 | 点击"发送心语"按钮 | 弹出评语输入弹窗 |
| TC-P-COMM-02 | 自定义评语发送 | 成功提示，弹窗关闭 |
| TC-P-COMM-03 | 发送后孩子端心语墙 | 实时显示该评语 |
| TC-P-COMM-04 | 选择推荐模板发送 | 成功提示 |
| TC-P-COMM-05 | 模板内容可编辑后发送 | 成功 |

### 发送心语 - 表单校验
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-COMM-06 | 空内容发送 | 弹窗不关闭，显示校验提示 |
| TC-P-COMM-07 | 超200字发送 | 字数超限提示，不提交 |
| TC-P-COMM-08 | 点击关闭弹窗 | 弹窗关闭，未发送 |

### 孩子端心语墙
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-COMM-09 | 孩子端心语墙区域可见 | isVisible |
| TC-P-COMM-10 | 最新评语显示在顶部 | 第一条 item 是最新发送的 |
| TC-P-COMM-11 | 无评语时空状态 | 显示占位文案或条目列表 |

---

## 六、个人中心 & 设置（parent-profile.spec.ts）

### 个人中心基础
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-01 | 显示家长昵称 | 昵称文本非空 |
| TC-P-PROF-02 | 显示绑定孩子信息 | 孩子信息区域可见 |
| TC-P-PROF-03 | 点击"设置"入口 | 跳转设置页 |
| TC-P-PROF-04 | 点击"孩子管理"入口 | 跳转孩子管理页 |

### 孩子管理 - 邀请码
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-05 | 生成邀请码 | 显示6位字母数字码 |
| TC-P-PROF-06 | 邀请码与后端一致 | UI 码 == API 码 |
| TC-P-PROF-07 | 孩子用邀请码绑定 | 绑定成功，孩子出现在列表 |

### 设置页菜单
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-08 | 账号与安全入口可见 | isVisible |
| TC-P-PROF-09 | 通知设置入口可见 | isVisible |
| TC-P-PROF-10 | 作息设置入口可见 | isVisible |
| TC-P-PROF-11 | 关于入口含版本号 | 版本信息可见 |

### 作息设置
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-12 | 作息设置含睡觉时间选择器 | isVisible |
| TC-P-PROF-13 | 修改睡觉时间21:30 | 保存成功，持久化验证 |
| TC-P-PROF-14 | 睡觉时间23:59（超上限）| 显示校验错误 |
| TC-P-PROF-15 | 睡觉时间18:00（低于下限）| 显示校验错误 |

### 通知设置
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-16 | 任务提醒开关可见 | isVisible |
| TC-P-PROF-17 | 切换任务提醒开关 | 状态保存并持久化 |

### 权限守卫
| ID | 测试点 | 预期结果 |
|----|--------|----------|
| TC-P-PROF-18 | 未登录访问个人中心 | 跳转登录页 |
| TC-P-PROF-19 | 未登录访问设置页 | 跳转登录页 |
| TC-P-PROF-20 | 孩子账号访问家长设置 | 拒绝访问 |

---

## 关键 data-testid 清单（开发时须添加）

### 家长首页
```
parent-home, stats-card, stats-completed, stats-total, stats-focus-time
task-section, habit-section, task-list-empty
btn-add-task, add-task-modal, input-task-title, subject-{math|chinese|english|other}
input-duration, btn-submit-task, btn-cancel-task, task-title-error
btn-mark-done, btn-delete-task, btn-edit-task
delete-confirm-modal, btn-confirm-delete, btn-cancel-delete
task-status-tag, subject-tag
tab-bar-plan, tab-bar-ranking, tab-bar-profile
```

### 任务创建/编辑页
```
task-create-form, btn-save-task, btn-cancel-task
input-task-title, task-title-error, task-duration-error
input-duration, btn-star-plus, reward-stars-value
```

### 计划管理页
```
plan-page, tab-today, tab-calendar, tab-templates
today-task-list, today-habit-list
calendar-grid, calendar-header, calendar-prev, calendar-next
calendar-day-{N}, day-dot, day-detail-panel, day-btn-add-task
template-list, template-daily-study, template-weekend-review
template-vacation, template-exam-sprint
template-detail, preset-task-{N}, btn-apply-today, btn-close-template
```

### 本周评比页
```
ranking-page, week-title, btn-prev-week, btn-next-week
weekly-summary-card, task-completion-rate, habit-completion-rate, focus-duration
weekly-stars, subject-stats
habit-weekly-calendar, week-day-{0~6}
reward-rules-card, rule-habit-standard, rule-task-standard
rule-achieved, rule-missed, ranking-empty
```

### 心语评语
```
btn-send-comment, comment-modal, input-comment
comment-templates, comment-template-{N}
btn-submit-comment, btn-close-comment, comment-content-error
comment-length-warning, success-toast
comment-wall, comment-item-{N}, comment-wall-empty
```

### 个人中心 & 设置
```
profile-page, profile-nickname, child-info-section
btn-goto-settings, btn-child-manage
child-manage-page, btn-gen-invite-code, invite-code, child-item-{N}
settings-page, settings-account, settings-notification, settings-schedule, settings-about
app-version
schedule-settings-page, sleep-time-picker, btn-save-schedule, sleep-time-error
notification-settings-page, switch-task-reminder, btn-save-notification
```
