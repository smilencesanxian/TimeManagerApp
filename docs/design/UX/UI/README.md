# TimeManagerApp 高保真UI设计

## 文件列表

### 入口导航
| 文件 | 描述 |
|------|------|
| `index.html` | 原型演示入口，所有页面索引 |

### 家长端页面
| 文件 | 描述 | 核心功能 |
|------|------|----------|
| `parent-dashboard.html` | 首页/实时看板 | 实时状态、今日概览、预警提示、快捷操作 |
| `parent-create-plan.html` | 创建计划 | 模板选择、AI识别弹窗、任务编辑、拖拽排序 |
| `parent-temp-task.html` | 临时作业推送 | 语音输入、AI识别、时长调整、一键推送 |
| `parent-statistics.html` | 数据统计 | 趋势折线图、科目饼图、效率分析、闪光点、分享 |
| `parent-send-message.html` | 发送心语 | AI推荐评语、自定义输入、快捷表情、发送 |
| `parent-goals.html` | 目标管理 | 长期目标、阶段里程碑、进度跟踪、新建目标 |
| `parent-habits.html` | 习惯管理 | 习惯打卡、连续记录、打卡日历、频率设置 |

### 孩子端页面
| 文件 | 描述 | 核心功能 |
|------|------|----------|
| `child-today-tasks.html` | 今日任务列表（横屏） | 任务卡片、番茄钟环形进度、打卡项、心语墙 |
| `child-calendar.html` | 任务日历 | 月视图、日期选择、任务回顾、完成情况 |
| `child-achievements.html` | 我的成就 | 星月太阳、成就日历、历史详情 |
| `child-rest-mode.html` | 休息模式 | 护眼模式、倒计时、护眼提示、云朵动画 |
| `task-complete-modal.html` | 任务完成弹窗 | 庆祝动效、智能推荐、倒计时自动关闭 |

### 通用页面
| 文件 | 描述 | 核心功能 |
|------|------|----------|
| `settings.html` | 设置 | 番茄钟设置、作息管理、通知设置、账号管理 |

## 查看方式

直接在浏览器中打开 `index.html` 即可进入导航页，点击卡片跳转到各页面进行交互演示。

## 主要交互功能

### 页面导航
- 底部导航栏切换各页面
- 家长端↔孩子端角色切换验证
- 返回按钮支持

### 功能交互
- **番茄钟**: 环形进度动画、颜色渐变（绿→黄→红）
- **打卡**: 复选框弹跳动画
- **AI识别**: 输入监听、模拟识别延迟、结果显示
- **语音输入**: 按钮动画、模拟录音
- **日历**: 日期选择、左右切换月份
- **弹窗**: 滑入动画、表单交互

### 动效
- 脉冲呼吸动画（番茄钟最后60秒）
- 云朵飘动背景（休息模式）
- 弹窗滑入动画
- 星星漂浮庆祝动效
- 倒计时圆环旋转

## 设计规范

### 色彩体系
```css
--color-primary: #6366F1          /* Indigo-500 - 信任感、专注力 */
--color-pomodoro-safe: #22C55E    /* Green-500 - 安全期(>50%) */
--color-pomodoro-warning: #F59E0B /* Amber-500 - 警告期(20-50%) */
--color-pomodoro-urgent: #EF4444  /* Red-500 - 紧迫期(<20%) */
--color-success: #22C55E
--color-bg: #F8FAFC
--color-surface: #FFFFFF
--color-text-primary: #1E293B
--color-star: #FBBF24
--color-moon: #A78BFA
--color-sun: #F59E0B
```

### 字体规范
- **中文**: PingFang SC / Noto Sans SC / Microsoft YaHei
- **倒计时**: SF Mono / Consolas (等宽字体，72px)

### 布局规范
- **孩子端横屏**: 左侧60%任务列表 + 右侧40%计时区
- **家长端竖屏**: 标准移动端布局，底部导航

---

**文档位置**: `/mnt/d/OpenClaw/TimeManagerApp/design/UI/README.md`
**更新日期**: 2026-03-15
**版本**: v1.1
