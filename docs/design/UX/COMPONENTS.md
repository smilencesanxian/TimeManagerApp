# TimeManagerApp - 组件详细规格文档

> 本文档提供每个 UI 组件的精确实现规格，供前端开发直接参考。

---

## 🔘 按钮组件 (Buttons)

### Button - Primary (主按钮)

```
┌─────────────────────────────┐
│      创建新计划              │  ← 文字居中，字重 600
└─────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 48px | - |
| 水平内边距 | 24px | 左右 |
| 垂直内边距 | 12px | 上下 |
| 背景色 | #6366F1 | `--color-primary` |
| 文字颜色 | #FFFFFF | - |
| 字体大小 | 16px | - |
| 字重 | 600 | Semibold |
| 圆角 | 12px | `--radius-lg` |
| 阴影 | 0 2px 8px rgba(0,0,0,0.08) | `--shadow-card` |
| 最小宽度 | 120px | - |

**交互状态:**

| 状态 | 背景色 | 变换 | 阴影 |
|------|--------|------|------|
| Default | #6366F1 | none | `--shadow-card` |
| Hover | #4F46E5 | - | `--shadow-highlight` |
| Active/Press | #4F46E5 | scale(0.98) | `--shadow-highlight` |
| Disabled | #E5E7EB | none | none |
| Loading | #6366F1 | opacity: 0.8 | `--shadow-card` |

**CSS 实现:**
```css
.btn-primary {
  height: 48px;
  padding: 12px 24px;
  background: #6366F1;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-primary:hover {
  background: #4F46E5;
  box-shadow: 0 4px 12px rgba(99,102,241,0.15);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
  box-shadow: none;
}
```

---

### Button - Secondary (次按钮)

```
┌─────────────────────────────┐
│      取消                   │  ← 边框按钮
└─────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 40px | - |
| 水平内边距 | 16px | - |
| 垂直内边距 | 8px | - |
| 背景色 | transparent | - |
| 边框 | 1px solid #E2E8F0 | `--color-border` |
| 文字颜色 | #1E293B | `--color-text-primary` |
| 字体大小 | 14px | - |
| 字重 | 500 | Medium |
| 圆角 | 8px | `--radius-md` |

---

### Button - Icon (图标按钮)

```
┌──────┐
│  ⚙️  │  ← 图标居中
└──────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 尺寸 | 48px × 48px | 最小可点击区域 |
| 背景 | transparent | - |
| 图标尺寸 | 24px × 24px | - |
| 圆角 | 8px | - |
| Hover背景 | #F8FAFC | `--color-bg` |

**CSS 实现:**
```css
.icon-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease;
}

.icon-btn:hover {
  background: #F8FAFC;
}

.icon-btn svg {
  width: 24px;
  height: 24px;
}
```

---

### Button - Floating Action Button (悬浮按钮)

```
    ┌────────┐
   /    +    \   ← 圆形，带阴影
  └──────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 尺寸 | 56px × 56px | - |
| 背景 | #6366F1 | `--color-primary` |
| 图标 | 24px | 白色 |
| 圆角 | 50% | 圆形 |
| 阴影 | 0 4px 12px rgba(99,102,241,0.4) | 强调阴影 |
| 位置 | fixed | 右下角, bottom: 24px, right: 16px |

---

## 🃏 卡片组件 (Cards)

### Card - Standard (标准卡片)

```
┌──────────────────────────────────┐
│                                  │
│   区块标题                        │  ← H2, 16px, weight 600
│                                  │
│   ┌──────────────────────────┐   │
│   │  内容区域                  │   │  ← 内边距 16px
│   │                          │   │
│   └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 背景 | #FFFFFF | `--color-surface` |
| 圆角 | 16px | `--radius-xl` |
| 内边距 | 16px | 四边 |
| 阴影 | 0 2px 8px rgba(0,0,0,0.08) | `--shadow-card` |
| 外边距 | 0 0 12px 0 | 底部间距 |

---

### Card - Task (任务卡片)

```
┌────────────────────────────────────────────────┐
│ ┌────┐                              ┌────────┐ │
│ │ 📘 │  数学作业 - 练习册P25-28      │ 进行中 │ │
│ └────┘  14:00 - 14:45  ·  45分钟     └────────┘ │
└────────────────────────────────────────────────┘
```

**布局结构:**
```
Flex Container (row, align-items: center, gap: 12px)
├── Icon Box (40px × 40px, border-radius: 10px)
├── Content (flex: 1)
│   ├── Title (15px, weight 500)
│   └── Meta (12px, color: `--color-text-secondary`)
└── Status Tag
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 布局 | Flex | row, align-items: center |
| 间距 | 12px | gap |
| 内边距 | 12px | - |
| 圆角 | 10px | - |
| 背景 | #F8FAFC | 默认状态 |

**状态变体:**

| 状态 | 背景 | 边框 | 说明 |
|------|------|------|------|
| 待办 (todo) | #F8FAFC | none | 默认状态 |
| 进行中 (doing) | #FFFFFF | 2px solid #6366F1 | 激活态 |
| 已完成 (done) | #F0FDF4 | 2px solid #22C55E | 左侧绿色边框 |

---

### Card - Habit (习惯打卡卡片)

```
┌────────────────────────────────────────────────┐
│  ┌────┐                                        │
│  │ ✓  │  每日阅读30分钟                         │
│  └────┘  🔥 连续 12 天                          │
└────────────────────────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 布局 | Flex | row, align-items: center |
| 间距 | 12px | gap |
| 内边距 | 12px | - |
| 圆角 | 10px | - |
| 背景 | #F8FAFC | - |

**复选框规格:**
| 属性 | 值 |
|------|-----|
| 尺寸 | 22px × 22px |
| 边框 | 2px solid #E2E8F0 |
| 圆角 | 6px |
| 未选中 | 背景透明 |
| 已选中 | 背景 #22C55E, 显示白色 ✓ |

---

### Card - Template (场景模板卡片)

```
┌────────────────────┐
│       📚           │  ← 图标 28px
│    日常学习        │  ← 标题 14px, weight 600
│   适合每天使用      │  ← 描述 12px
└────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 背景 | #FFFFFF | - |
| 边框 | 2px solid #E2E8F0 | 默认 |
| 选中边框 | 2px solid #6366F1 | 激活态 |
| 圆角 | 12px | - |
| 内边距 | 16px | - |
| 阴影 | 0 4px 12px rgba(99,102,241,0.15) | 选中态 |

---

## 📝 表单组件 (Form Elements)

### Input - Text (文本输入框)

```
┌──────────────────────────────────────────────┐
│  请输入任务名称                                │
└──────────────────────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 48px | - |
| 水平内边距 | 16px | - |
| 垂直内边距 | 12px | - |
| 背景 | #FFFFFF | - |
| 边框 | 1px solid #E2E8F0 | 默认 |
| 圆角 | 8px | - |
| 字体 | 15px | - |
| 占位符颜色 | #94A3B8 | `--color-text-tertiary` |

**状态样式:**

| 状态 | 边框 | 阴影 |
|------|------|------|
| Default | #E2E8F0 | none |
| Focus | #6366F1 | 0 0 0 3px rgba(99,102,241,0.1) |
| Error | #EF4444 | 0 0 0 3px rgba(239,68,68,0.1) |
| Disabled | #E2E8F0 | none |

**CSS 实现:**
```css
.input-text {
  height: 48px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 150ms ease;
}

.input-text:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

.input-text:disabled {
  background: #F1F5F9;
  color: #94A3B8;
}

.input-text::placeholder {
  color: #94A3B8;
}
```

---

### Input - Time (时间选择)

```
┌─────────────┐  ┌─────────────┐
│   14:00     │  │   14:45     │
└─────────────┘  └─────────────┘
   开始时间         结束时间
```

| 属性 | 值 |
|------|-----|
| 宽度 | 120px |
| 高度 | 48px |
| 背景 | #FFFFFF |
| 边框 | 1px solid #E2E8F0 |
| 圆角 | 8px |
| 文字对齐 | 居中 |
| 字体 | 16px, weight 500 |

---

### Checkbox (复选框)

```
未选中:  ┌────┐      选中:  ┌────┐
         │    │            │ ✓  │
         └────┘            └────┘
        边框 #E2E8F0      背景 #22C55E
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 尺寸 | 22px × 22px | - |
| 边框 | 2px solid #E2E8F0 | 未选中 |
| 圆角 | 6px | - |
| 选中背景 | #22C55E | - |
| 选中图标 | ✓ | 白色, 14px |
| 过渡 | 150ms ease | - |

---

### Select (下拉选择)

```
┌──────────────────────────────────────────┐
│  请选择学科                    ▼         │
└──────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 高度 | 48px |
| 水平内边距 | 16px |
| 背景 | #FFFFFF |
| 边框 | 1px solid #E2E8F0 |
| 圆角 | 8px |
| 箭头颜色 | #64748B |

---

## 🏷️ 标签组件 (Tags)

### Tag - Status (状态标签)

```
┌────────┐
│ 进行中 │
└────────┘
```

| 状态 | 背景色 | 文字色 | 示例 |
|------|--------|--------|------|
| 进行中 | #FEF3C7 | #D97706 | 黄色系 |
| 已完成 | #DCFCE7 | #16A34A | 绿色系 |
| 待办 | #F1F5F9 | #64748B | 灰色系 |
| 优秀 | #DCFCE7 | #16A34A | 绿色系 |
| 良好 | #FEF3C7 | #D97706 | 黄色系 |
| 一般 | #F1F5F9 | #64748B | 灰色系 |

**通用规格:**
| 属性 | 值 |
|------|-----|
| 水平内边距 | 10px |
| 垂直内边距 | 4px |
| 圆角 | 12px |
| 字体 | 12px, weight 500 |

---

### Tag - Subject (学科标签)

```
┌────────┐
│  数学  │
└────────┘
```

| 学科 | 背景 | 前景 |
|------|------|------|
| 数学 | #DBEAFE | #3B82F6 |
| 语文 | #DCFCE7 | #22C55E |
| 英语 | #FEF3C7 | #F59E0B |
| 其他 | #F3E8FF | #A855F7 |

---

## 🧭 导航组件 (Navigation)

### Header (页面头部)

```
┌────────────────────────────────────────────────┐
│  ←        页面标题                   [设置]   │
└────────────────────────────────────────────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 56px | - |
| 背景 | #FFFFFF | - |
| 边框 | 底部 1px solid #E2E8F0 | - |
| 水平内边距 | 16px | - |
| 标题字体 | 18px, weight 600 | 居中或左对齐 |

**布局结构:**
```
Flex (row, align-items: center, justify-content: space-between)
├── Left Area (返回按钮 / 留空)
├── Center Area (标题, flex: 1, text-align: center)
└── Right Area (操作按钮 / 留空)
```

---

### Tab Navigation (Tab 导航)

```
┌───────────────┬───────────────┬───────────────┐
│   今日计划     │   日历总览     │   场景模板     │
│              ════════════════════             │
└───────────────┴───────────────┴───────────────┘
              ↑ 激活态下划线
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 48px | - |
| 背景 | #FFFFFF | - |
| 边框 | 底部 1px solid #E2E8F0 | - |
| 水平内边距 | 16px | 整体 |
| Tab 间距 | 0 | 均分宽度 |

**Tab 项规格:**
| 属性 | 激活态 | 非激活态 |
|------|--------|----------|
| 字体 | 15px, weight 600 | 15px, weight 400 |
| 颜色 | #6366F1 | #64748B |
| 下边框 | 2px solid #6366F1 | transparent |
| 过渡 | 200ms ease | - |

---

### Bottom Navigation (底部导航)

```
┌──────────┬──────────┬──────────┬──────────┐
│    🏠    │    📋    │    🏆    │    👤    │
│   首页   │   计划   │   排行   │   我的   │
└──────────┴──────────┴──────────┴──────────┘
```

| 属性 | 值 | 备注 |
|------|-----|------|
| 高度 | 64px + env(safe-area-inset-bottom) | 含安全区域 |
| 背景 | #FFFFFF | - |
| 边框 | 顶部 1px solid #E2E8F0 | - |
| 布局 | Flex | justify-content: space-around |

**导航项规格:**
| 属性 | 激活态 | 非激活态 |
|------|--------|----------|
| 图标尺寸 | 24px | 24px |
| 图标颜色 | #6366F1 | #94A3B8 |
| 文字尺寸 | 11px | 11px |
| 文字颜色 | #6366F1 | #94A3B8 |
| 图标与文字间距 | 4px | 4px |

---

## 🔔 反馈组件 (Feedback)

### Toast (轻提示)

```
         ┌─────────────────────┐
         │  ✓ 任务创建成功      │
         └─────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 背景 | rgba(0,0,0,0.8) |
| 文字颜色 | #FFFFFF |
| 圆角 | 8px |
| 水平内边距 | 16px |
| 垂直内边距 | 10px |
| 字体 | 14px |
| 位置 | 居中, bottom: 100px |
| 动画 | 淡入 300ms, 停留 2s, 淡出 300ms |

**CSS 实现:**
```css
.toast {
  position: fixed;
  left: 50%;
  bottom: 100px;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #FFFFFF;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  animation: toastIn 300ms ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

---

### Modal (模态框)

```
┌────────────────────────────────────────────────┐
│                                                │ ← 遮罩层 rgba(0,0,0,0.5)
│         ┌──────────────────────────┐           │
│         │       🎉               │           │
│         │    任务完成！           │           │
│         │                         │           │
│         │   获得 2 颗星星！       │           │
│         │                         │           │
│         │    [ 太棒了 ]           │           │
│         └──────────────────────────┘           │
│                                                │
└────────────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 遮罩背景 | rgba(0,0,0,0.5) |
| 卡片背景 | #FFFFFF |
| 圆角 | 16px |
| 内边距 | 24px |
| 宽度 | 80% (max 320px) |
| 动画 | 从底部滑入 + 淡入 |

---

## 📊 数据展示组件 (Data Display)

### Calendar (日历组件)

```
      2026年3月
  ←         →
 日  一  二  三  四  五  六
┌──┬──┬──┬──┬──┬──┬──┐
│23│24│25│26│27│28│01│
├──┼──┼──┼──┼──┼──┼──┤
│02│03│04│05│06│07│08│
├──┼──┼──┼──┼──┼──┼──┤
│09│10│11│12│13│14│15│
├──┼──┼──┼──┼──┼──┼──┤
│16│17│18│19│20│21│22│
├──┼──┼──┼──┼──┼──┼──┤
│23│24│25│26│27│28│29│
├──┼──┼──┼──┼──┼──┼──┤
│30│31│  │  │  │  │  │
└──┴──┴──┴──┴──┴──┴──┘
```

| 属性 | 值 |
|------|-----|
| 网格 | 7列 |
| 单元格 | aspect-ratio: 1 |
| 间隙 | 4px |
| 今日背景 | #6366F1 |
| 今日文字 | #FFFFFF |
| 选中边框 | 2px solid #6366F1 |
| 有计划标记 | 底部4px圆点 #22C55E |

---

### Progress Ring (环形进度条)

```
        ╭──────────╮
      ╱   25:00    ╲     ← 时间居中
     │                │
      ╲   专注中    ╱
        ╰──────────╯
```

| 属性 | 值 |
|------|-----|
| 尺寸 | 200px × 200px |
| 圆环宽度 | 12px |
| 背景圆环 | #E2E8F0 |
| 进度圆环 | 根据时间状态变化 |
| 时间字体 | 48px, weight 700 |
| 状态字体 | 14px, weight 400 |

**CSS 实现:**
```css
.progress-ring {
  width: 200px;
  height: 200px;
  position: relative;
}

.progress-ring svg {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: #E2E8F0;
  stroke-width: 12;
}

.progress-ring-fill {
  fill: none;
  stroke: #6366F1;
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-time {
  font-size: 48px;
  font-weight: 700;
  color: #1E293B;
}

.progress-label {
  font-size: 14px;
  color: #64748B;
}
```

---

### Achievement Badge (成就徽章)

```
   ⭐ × 45      🌙 × 4      ☀️ × 0
   ────        ────        ────
   星星         月亮         太阳
```

| 属性 | 星星 | 月亮 | 太阳 |
|------|------|------|------|
| 图标 | ⭐ | 🌙 | ☀️ |
| 颜色 | #FBBF24 | #A78BFA | #F59E0B |
| 图标尺寸 | 24px | 24px | 24px |
| 数字字体 | 18px, weight 500 | 同上 | 同上 |

---

## 🎨 特殊组件 (Special Components)

### Empty State (空状态)

```
         ┌──────────────────┐
         │                  │
         │     📭          │
         │                  │
         │  暂无任务        │
         │                  │
         │ 点击下方按钮    │
         │  创建第一个计划  │
         │                  │
         │   [创建计划]    │
         │                  │
         └──────────────────┘
```

| 属性 | 值 |
|------|-----|
| 图标 | 64px, 灰色系 |
| 标题 | 16px, weight 600, color: `--color-text-primary` |
| 描述 | 14px, color: `--color-text-secondary` |
| 按钮 | Primary Button |
| 布局 | Flex column, 居中 |
| 间距 | 图标与标题 16px, 标题与描述 8px, 描述与按钮 24px |

---

### Skeleton Loading (骨架屏)

```
┌────────────────────────────────────────────────┐
│ ┌────────────┐                                 │
│ │ ▓▓▓▓▓▓▓▓▓▓ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│ └────────────┘  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│                 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
└────────────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 基础色 | #F1F5F9 |
| 高亮色 | #E2E8F0 |
| 动画 | shimmer 1.5s infinite |
| 圆角 | 4px |

**CSS 实现:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #F1F5F9 25%,
    #E2E8F0 50%,
    #F1F5F9 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 📐 布局组件 (Layout)

### Page Container (页面容器)

```
┌────────────────────────────────────────────────┐
│ Status Bar (24px)                              │ ← 系统
├────────────────────────────────────────────────┤
│ Header (56px)                                  │
├────────────────────────────────────────────────┤
│                                                │
│ Content (flex: 1)                              │
│ padding: 16px                                  │
│ overflow-y: auto                               │
│                                                │
├────────────────────────────────────────────────┤
│ Bottom Nav (64px + safe-area)                  │
└────────────────────────────────────────────────┘
```

**CSS 实现:**
```css
.page-container {
  max-width: 414px;
  margin: 0 auto;
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
}

.page-header {
  height: 56px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.page-bottom-nav {
  height: 64px;
  background: #FFFFFF;
  border-top: 1px solid #E2E8F0;
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### List Container (列表容器)

```
┌────────────────────────────────────────────────┐
│ Section Title                                  │
├────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐   │
│ │ List Item 1                              │   │ ← gap: 8px
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ List Item 2                              │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ List Item 3                              │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 列表项间距 | 8px (margin-bottom) |
| 最后一项 | margin-bottom: 0 |

---

## 📱 横屏组件 (Landscape Mode)

### Child Task View (儿童端任务视图)

```
┌────────────────────────────────────────────────────────────────┐
│ Status Bar (64px) - Achievements + Focus Timer                 │
├──────────────────────────────────────────┬─────────────────────┤
│                                          │                     │
│ Task List (60% width)                    │ Timer Area (40%)    │
│                                          │                     │
│ ┌────────────────────────────────────┐   │  ╭──────────────╮   │
│ │ Task 1                             │   │  │   25:00    │   │
│ ├────────────────────────────────────┤   │  │            │   │
│ │ Task 2                             │   │  │   专注中   │   │
│ ├────────────────────────────────────┤   │  ╰──────────────╯   │
│ │ Task 3                             │   │                     │
│ ├────────────────────────────────────┤   │  [ 开始 ] [ 暂停 ]  │
│ │ ...                                │   │                     │
│ └────────────────────────────────────┘   │                     │
│                                          │                     │
└──────────────────────────────────────────┴─────────────────────┘
```

**CSS 实现:**
```css
.child-app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.child-status-bar {
  height: 64px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.child-main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.child-task-panel {
  width: 60%;
  background: #F8FAFC;
  overflow-y: auto;
  padding: 16px;
}

.child-timer-panel {
  width: 40%;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
```

---

## 🎯 图标规范 (Icons)

### 图标列表

| 图标 | Unicode | 使用场景 |
|------|---------|----------|
| 返回 | ← | 返回上一页 |
| 设置 | ⚙️ | 设置入口 |
| 首页 | 🏠 | 底部导航-首页 |
| 计划 | 📋 | 底部导航-计划 |
| 排行 | 🏆 | 底部导航-排行 |
| 我的 | 👤 | 底部导航-我的 |
| 添加 | + | 创建新项 |
| 编辑 | ✏️ | 编辑操作 |
| 删除 | 🗑️ | 删除操作 |
| 完成 | ✓ | 完成标记 |
| 星星 | ⭐ | 成就系统 |
| 月亮 | 🌙 | 成就系统 |
| 太阳 | ☀️ | 成就系统 |
| 专注 | 🔥 | 专注状态 |
| 数学 | 📘 | 学科标签 |
| 语文 | 📗 | 学科标签 |
| 英语 | 📙 | 学科标签 |
| 提醒 | 🔔 | 消息通知 |
| 日历 | 📅 | 日历视图 |
| 习惯 | 🌱 | 习惯打卡 |

### 图标尺寸

| 场景 | 尺寸 |
|------|------|
| 导航图标 | 24px |
| 按钮图标 | 20px |
| 列表图标 | 20px |
| 大图标 | 28px |
| 成就图标 | 24px |
| 空状态图标 | 64px |

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
