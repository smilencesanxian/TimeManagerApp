# TimeManagerApp - UX 设计开发规范文档
> **Version**: 2.0  
> **Date**: 2026-03-16  
> **Platform**: iOS/Android Mobile Web (PWA)  
> **Target**: iPhone 6.1" (375×812 logical pixels) / Android 6.5" (360×800)

---

## 📁 文档结构

```
design/
├── UI/                          # HTML 交互原型
│   ├── parent-dashboard.html    # 家长端-首页
│   ├── parent-plan-manage.html  # 家长端-计划管理
│   ├── parent-ranking.html      # 家长端-本周评比
│   ├── child-today-tasks.html   # 孩子端-今日任务
│   ├── child-achievements.html  # 孩子端-成就
│   └── ...
├── UX-SPECIFICATION.md          # 本规范文档
├── DESIGN-TOKENS.json           # 设计 Token (开发直接引用)
└── COMPONENTS.md                # 组件详细规格
```

---

## 🎨 一、Design System (设计系统)

### 1.1 颜色系统 (Color Palette)

#### 品牌色 (Brand Colors)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-primary` | `#6366F1` | rgb(99, 102, 241) | 主按钮、Tab激活态、选中状态 |
| `--color-primary-hover` | `#4F46E5` | rgb(79, 70, 229) | 按钮悬停/按下态 |
| `--color-primary-light` | `#E0E7FF` | rgb(224, 231, 255) | 浅色背景、高亮区域 |

#### 语义色 (Semantic Colors)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-success` | `#22C55E` | rgb(34, 197, 94) | 完成状态、成功提示 |
| `--color-warning` | `#F59E0B` | rgb(245, 158, 11) | 警告、待办、番茄钟警告态 |
| `--color-error` | `#EF4444` | rgb(239, 68, 68) | 错误、紧急、番茄钟危险态 |

#### 番茄钟专用状态色
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-pomodoro-safe` | `#22C55E` | rgb(34, 197, 94) | 剩余时间充足 (>60%) |
| `--color-pomodoro-warning` | `#F59E0B` | rgb(245, 158, 11) | 剩余时间中等 (30%-60%) |
| `--color-pomodoro-urgent` | `#EF4444` | rgb(239, 68, 68) | 剩余时间不足 (<30%) |

#### 中性色 (Neutral Colors)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-bg` | `#F8FAFC` | rgb(248, 250, 252) | 页面背景色 |
| `--color-surface` | `#FFFFFF` | rgb(255, 255, 255) | 卡片、浮层面板 |
| `--color-border` | `#E2E8F0` | rgb(226, 232, 240) | 边框、分割线 |

#### 文字色 (Text Colors)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-text-primary` | `#1E293B` | rgb(30, 41, 59) | 主要文字 (标题、正文) |
| `--color-text-secondary` | `#64748B` | rgb(100, 116, 139) | 次要文字 (描述、辅助信息) |
| `--color-text-tertiary` | `#94A3B8` | rgb(148, 163, 184) | 占位文字、禁用态 |

#### 成就系统颜色
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-star` | `#FBBF24` | rgb(251, 191, 36) | 星星奖励 |
| `--color-moon` | `#A78BFA` | rgb(167, 139, 250) | 月亮奖励 (10⭐=1🌙) |
| `--color-sun` | `#F59E0B` | rgb(245, 158, 11) | 太阳奖励 (10🌙=1☀️) |

#### 学科标签色
| 学科 | 前景色 | 背景色 | Usage |
|------|--------|--------|-------|
| 数学 | `#3B82F6` | `#DBEAFE` | 蓝色系 |
| 语文 | `#22C55E` | `#DCFCE7` | 绿色系 |
| 英语 | `#F59E0B` | `#FEF3C7` | 黄色系 |
| 其他 | `#A855F7` | `#F3E8FF` | 紫色系 |

---

### 1.2 字体系统 (Typography)

#### 字体栈
```css
--font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
--font-mono: "SF Mono", "Consolas", "Monaco", monospace;
```

#### 字体规范
| 层级 | 字号 | 行高 | 字重 | Usage |
|------|------|------|------|-------|
| H1 - 页面标题 | 20px | 28px | 600 (Semibold) | 导航栏标题 |
| H2 - 卡片标题 | 16px | 24px | 600 (Semibold) | 区块标题、Section Title |
| H3 - 列表标题 | 15px | 22px | 500 (Medium) | 任务名称、习惯名称 |
| Body - 正文 | 14px | 20px | 400 (Regular) | 描述文字 |
| Caption - 辅助 | 12px | 16px | 400 (Regular) | 时间、状态标签 |
| Small - 最小 | 11px | 14px | 400 (Regular) | 角标、提示 |

---

### 1.3 间距系统 (Spacing)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | 极窄间距、图标与文字间距 |
| `--space-2` | 8px | 紧凑间距、组件内部间距 |
| `--space-3` | 12px | 标准间距、列表项间距 |
| `--space-4` | 16px | 页面边距、卡片内边距 |
| `--space-5` | 20px | 宽松间距、大卡片间距 |
| `--space-6` | 24px | 区块间距 |
| `--space-8` | 32px | 大区块间距 |
| `--space-10` | 40px | 超大间距 |

#### 布局规范
- **页面边距**: 16px (左右)
- **卡片内边距**: 16px
- **列表项间距**: 8px (margin-bottom)
- **卡片间距**: 12px (margin-bottom)
- **按钮内边距**: 12px 垂直, 24px 水平 (大按钮)
- **图标按钮**: 48px × 48px (最小可点击区域)

---

### 1.4 圆角系统 (Border Radius)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | 小按钮、标签 |
| `--radius-md` | 8px | 标准卡片、输入框 |
| `--radius-lg` | 12px | 大卡片、模态框 |
| `--radius-xl` | 16px | 页面容器、浮层 |
| `--radius-full` | 9999px | 圆形按钮、头像、胶囊标签 |

---

### 1.5 阴影系统 (Shadows)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 微妙层次 |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | 悬浮卡片 |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | 下拉菜单、浮层 |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.08)` | 标准卡片 (最常用) |
| `--shadow-highlight` | `0 4px 12px rgba(99,102,241,0.15)` | 选中态、高亮卡片 |

---

## 🧩 二、组件规范 (Components)

### 2.1 按钮 (Buttons)

#### 主按钮 (Primary Button)
| 属性 | 规格 |
|------|------|
| 高度 | 48px |
| 内边距 | 12px 24px |
| 背景色 | `#6366F1` |
| 文字色 | `#FFFFFF` |
| 字号 | 16px, 字重 600 |
| 圆角 | 12px (`--radius-lg`) |
| 阴影 | `--shadow-card` |

**状态样式:**
| 状态 | 样式 |
|------|------|
| Default | 如上 |
| Hover/Active | 背景变为 `#4F46E5` |
| Disabled | 背景 `#E5E7EB`, 文字 `#9CA3AF`, cursor: not-allowed |
| Loading | 显示加载动画，透明度 0.8 |

#### 次按钮 (Secondary Button)
| 属性 | 规格 |
|------|------|
| 高度 | 40px |
| 内边距 | 8px 16px |
| 背景色 | 透明 |
| 边框 | 1px solid `#E2E8F0` |
| 文字色 | `#1E293B` |
| 圆角 | 8px |

#### 图标按钮 (Icon Button)
| 属性 | 规格 |
|------|------|
| 尺寸 | 48px × 48px (最小可点击区域) |
| 背景 | 透明 |
| 图标尺寸 | 24px × 24px |
| 圆角 | 8px |
| Hover | 背景变为 `#F8FAFC` |

---

### 2.2 卡片 (Cards)

#### 标准卡片 (Standard Card)
| 属性 | 规格 |
|------|------|
| 背景 | `#FFFFFF` |
| 圆角 | 16px (`--radius-xl`) |
| 内边距 | 16px |
| 阴影 | `--shadow-card` |
| 外边距 | 0 0 12px 0 |

#### 任务卡片 (Task Card)
| 属性 | 规格 |
|------|------|
| 布局 | Flex, align-items: center |
| 间距 | gap: 12px |
| 内边距 | 12px |
| 背景 | `#F8FAFC` (默认), `#F0FDF4` (已完成) |
| 圆角 | 10px |
| 边框 | 无 (默认), 2px solid `#6366F1` (进行中/激活) |

**状态样式:**
| 状态 | 背景色 | 左边框 |
|------|--------|--------|
| 待办 | `#F8FAFC` | 无 |
| 进行中 | `#FFFFFF` | 2px solid `#6366F1` |
| 已完成 | `#F0FDF4` | 2px solid `#22C55E` |

---

### 2.3 表单组件 (Form Elements)

#### 输入框 (Input)
| 属性 | 规格 |
|------|------|
| 高度 | 48px |
| 内边距 | 12px 16px |
| 背景 | `#FFFFFF` |
| 边框 | 1px solid `#E2E8F0` |
| 圆角 | 8px |
| 字号 | 15px |

**状态样式:**
| 状态 | 样式 |
|------|------|
| Default | 如上 |
| Focus | 边框变为 `#6366F1`, box-shadow: 0 0 0 3px rgba(99,102,241,0.1) |
| Error | 边框变为 `#EF4444` |
| Disabled | 背景 `#F1F5F9`, 文字 `#94A3B8` |

#### 复选框 (Checkbox)
| 属性 | 规格 |
|------|------|
| 尺寸 | 22px × 22px |
| 边框 | 2px solid `#E2E8F0` |
| 圆角 | 6px |
| 选中态 | 背景 `#22C55E`, 边框 `#22C55E`, 显示白色 ✓ |

---

### 2.4 状态标签 (Status Tags)

| 状态 | 背景色 | 文字色 | 圆角 | 内边距 |
|------|--------|--------|------|--------|
| 进行中 (doing) | `#FEF3C7` | `#D97706` | 12px | 4px 10px |
| 已完成 (done) | `#DCFCE7` | `#16A34A` | 12px | 4px 10px |
| 待办 (todo) | `#F1F5F9` | `#64748B` | 12px | 4px 10px |
| 优秀 (excellent) | `#DCFCE7` | `#16A34A` | 12px | 4px 10px |
| 良好 (good) | `#FEF3C7` | `#D97706` | 12px | 4px 10px |
| 一般 (normal) | `#F1F5F9` | `#64748B` | 12px | 4px 10px |

---

### 2.5 Tab 导航 (Tab Navigation)

| 属性 | 规格 |
|------|------|
| 高度 | 48px |
| 背景 | `#FFFFFF` |
| 边框 | 底部 1px solid `#E2E8F0` |
| Tab 文字 | 15px, 居中 |
| 激活态 | 文字色 `#6366F1`, 底部边框 2px solid `#6366F1`, 字重 600 |
| 非激活态 | 文字色 `#64748B`, 底部边框透明 |

---

### 2.6 底部导航 (Bottom Navigation)

| 属性 | 规格 |
|------|------|
| 高度 | 64px + env(safe-area-inset-bottom) |
| 背景 | `#FFFFFF` |
| 边框 | 顶部 1px solid `#E2E8F0` |
| 布局 | Flex, justify-content: space-around |
| 图标尺寸 | 24px |
| 文字尺寸 | 11px |
| 图标与文字间距 | 4px |
| 激活态 | 图标/文字色 `#6366F1` |
| 非激活态 | 图标/文字色 `#94A3B8` |

---

## 📐 三、页面布局规范 (Page Layout)

### 3.1 布局网格 (Layout Grid)

- **容器宽度**: max-width: 414px (iPhone Pro Max 逻辑宽度), 居中
- **列数**: 单列布局 (移动端)
- **页面边距**: 16px (左右)

### 3.2 响应式断点 (Responsive Breakpoints)

| 断点 | 宽度范围 | 布局调整 |
|------|----------|----------|
| Mobile (默认) | < 480px | 单列布局，全宽卡片 |
| Tablet | 480px - 768px | 可考虑双列卡片网格 |
| Desktop | > 768px | 居中容器，最大宽度 414px |

### 3.3 安全区域 (Safe Area)

```css
/* iPhone 刘海屏适配 */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

---

### 3.4 页面结构 (Page Structure)

#### 移动端标准页面结构
```
┌─────────────────────────────┐
│  Status Bar (系统状态栏)      │  ← 系统控制，无需设计
├─────────────────────────────┤
│  Header (56px)              │  ← 标题 + 操作按钮
├─────────────────────────────┤
│                             │
│  Content Area (flex: 1)     │  ← 可滚动内容区
│  padding: 16px              │
│                             │
├─────────────────────────────┤
│  Bottom Nav (64px + safe)   │  ← Tab 导航
└─────────────────────────────┘
```

#### 孩子端横屏布局
```
┌────────────────────────────────────────────────┐
│  Status Bar (64px) - 星星/月亮/专注时间          │
├──────────────────────────┬─────────────────────┤
│                          │                     │
│  Task List (60% width)   │  Timer Area (40%)   │
│  可滚动任务列表           │  倒计时 + 操作按钮   │
│                          │                     │
└──────────────────────────┴─────────────────────┘
```

---

## 🔄 四、交互规范 (Interactions)

### 4.1 转场动画 (Transitions)

| 场景 | 时长 | 缓动函数 | 说明 |
|------|------|----------|------|
| 页面切换 | 300ms | ease-in-out | 滑动或淡入淡出 |
| 按钮悬停 | 150ms | ease | 背景色变化 |
| 卡片选中 | 200ms | ease-out | 边框、阴影变化 |
| Tab 切换 | 200ms | ease | 下划线滑动 |
| 模态框出现 | 250ms | cubic-bezier(0.4, 0, 0.2, 1) | 从底部滑入 + 淡入 |
| Toast 提示 | 300ms | ease-out | 淡入，停留 2s |

### 4.2 微交互 (Micro-interactions)

| 元素 | 交互 | 反馈 |
|------|------|------|
| 按钮 | 点击 | 缩放 0.98, 背景色变深 |
| 卡片 | 点击 | 轻微上移 2px + 阴影加深 |
| 列表项 | 滑动 | 弹性回弹效果 |
| 复选框 | 选中 | 缩放弹跳动画 |
| 开关 | 切换 | 滑动 + 颜色渐变 |

### 4.3 手势操作 (Gestures)

| 手势 | 场景 | 响应 |
|------|------|------|
| 点击 (Tap) | 按钮、卡片、列表项 | 触发对应操作 |
| 长按 (Long Press) | 任务卡片 | 进入编辑/删除模式 |
| 左滑 (Swipe Left) | 列表项 | 显示删除按钮 |
| 右滑 (Swipe Right) | 列表项 | 标记完成 |
| 下拉 (Pull Down) | 内容区顶部 | 刷新数据 |
| 上拉 (Pull Up) | 内容区底部 | 加载更多 |

---

## 📱 五、功能模块规范 (Feature Modules)

### 5.1 番茄钟计时器 (Pomodoro Timer)

#### 视觉规范
| 属性 | 规格 |
|------|------|
| 计时器尺寸 | 200px × 200px (圆形) |
| 背景圆环 | 12px 宽, `#E2E8F0` |
| 进度圆环 | 12px 宽, 根据时间变化颜色 |
| 时间文字 | 48px, 字重 700, 居中 |
| 状态文字 | 14px, 居中, 在时间下方 |

#### 进度颜色规则
```
剩余时间 > 60% → #22C55E (绿色)
剩余时间 30%-60% → #F59E0B (橙色)
剩余时间 < 30% → #EF4444 (红色)
```

### 5.2 任务状态流转

```
待办 (todo) → 进行中 (doing) → 已完成 (done)
     ↑                           ↓
     └──────── 可重置 ───────────┘
```

### 5.3 奖励系统计算规则

| 操作 | 奖励 | 说明 |
|------|------|------|
| 完成任务 | +1 ⭐ | 基础奖励 |
| 连续7天打卡 | +5 ⭐ | 全勤奖励 |
| 专注时长 > 30min | +2 ⭐ | 专注奖励 |
| 10 ⭐ | = 1 🌙 | 自动兑换 |
| 10 🌙 | = 1 ☀️ | 自动兑换 |

---

## 🛠️ 六、开发实施指南 (Implementation Guide)

### 6.1 技术栈建议

- **框架**: React Native / Flutter / Vue3 + Vant / UniApp
- **样式方案**: CSS Variables / Tailwind CSS / Styled Components
- **图标库**: Lucide React / Iconfont / SVG Sprite
- **状态管理**: Redux / Pinia / Provider

### 6.2 设计 Token 使用

**CSS Variables 方式:**
```css
:root {
  /* 直接复制 DESIGN-TOKENS.json 中的值 */
  --color-primary: #6366F1;
  --space-4: 16px;
  --radius-lg: 12px;
}

.button-primary {
  background: var(--color-primary);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
}
```

**Tailwind 配置:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        success: '#22C55E',
        // ...
      },
      spacing: {
        '4': '16px',
        // ...
      }
    }
  }
}
```

### 6.3 图片资源规范

| 类型 | 格式 | 尺寸 | 命名规范 |
|------|------|------|----------|
| 图标 | SVG | 24×24 | icon-{name}.svg |
| 插图 | PNG/WebP | 2x 分辨率 | illust-{scene}.png |
| 头像 | JPG | 100×100 | avatar-{id}.jpg |
| 表情 | PNG | 64×64 | emoji-{name}.png |

### 6.4 无障碍设计 (Accessibility)

- **最小可点击区域**: 44px × 44px
- **颜色对比度**: 文字与背景对比度 ≥ 4.5:1
- **焦点状态**: 所有可交互元素需有可见焦点样式
- **语义化**: 正确使用 HTML 标签 (button, nav, main 等)

---

## 📎 附录

### A. 文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| UX-SPECIFICATION.md | `/design/UX-SPECIFICATION.md` | 本规范文档 |
| DESIGN-TOKENS.json | `/design/DESIGN-TOKENS.json` | 设计 Token |
| COMPONENTS.md | `/design/COMPONENTS.md` | 组件详细文档 |
| 家长端首页 | `/design/UI/parent-dashboard.html` | 交互原型 |
| 家长端计划管理 | `/design/UI/parent-plan-manage.html` | 交互原型 |
| 家长端排行 | `/design/UI/parent-ranking.html` | 交互原型 |
| 孩子端今日任务 | `/design/UI/child-today-tasks.html` | 交互原型 |
| 孩子端成就 | `/design/UI/child-achievements.html` | 交互原型 |

### B. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v2.0 | 2026-03-16 | 新增计划管理整合页、排行功能、简化儿童端 |
| v1.0 | 2026-03-15 | 初始版本，基础功能页面 |

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
