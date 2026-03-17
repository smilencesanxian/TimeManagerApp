# TimeManagerApp - 动效规范文档
> **Version**: 2.0  
> **Date**: 2026-03-16

---

## 🎬 动画设计原则

1. **有意义**: 动画应引导注意力或提供反馈，而非装饰
2. **快速**: 移动端动画应在 300ms 以内完成
3. **流畅**: 使用硬件加速属性 (transform, opacity)
4. **一致**: 同类动画使用相同的时长和缓动函数

---

## ⏱️ 动画时长规范

| 类型 | 时长 | 缓动函数 | 使用场景 |
|------|------|----------|----------|
| **微交互** | 150ms | ease | 按钮悬停、颜色变化 |
| **标准** | 200ms | ease-out | Tab 切换、卡片选中 |
| **页面** | 300ms | ease-in-out | 页面切换、模态框 |
| **强调** | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | 成就弹窗、庆祝动画 |
| **循环** | 1.5s | linear | Loading、Shimmer |

---

## 🔄 页面转场动画

### 进入子页面 (Push)

```css
/* 新页面从右侧滑入 */
.page-enter {
  animation: pageEnter 300ms ease-in-out;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 旧页面向左移动并淡出 */
.page-exit {
  animation: pageExit 300ms ease-in-out;
}

@keyframes pageExit {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0.8;
    transform: translateX(-20%);
  }
}
```

### 返回上级 (Pop)

```css
/* 当前页面向右滑出 */
.page-pop-exit {
  animation: pagePopExit 300ms ease-in-out;
}

@keyframes pagePopExit {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 旧页面从左侧滑入 */
.page-pop-enter {
  animation: pagePopEnter 300ms ease-in-out;
}

@keyframes pagePopEnter {
  from {
    opacity: 0.8;
    transform: translateX(-20%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## 🎭 模态框动画

### 底部弹出 Modal

```css
.modal-overlay {
  animation: fadeIn 250ms ease;
  background: rgba(0, 0, 0, 0.5);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  animation: slideUp 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 关闭动画 */
.modal-close .modal-content {
  animation: slideDown 200ms ease-in;
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

---

## 🔘 按钮微交互

### 主按钮点击反馈

```css
.btn-primary {
  transition: transform 150ms ease, 
              background-color 150ms ease,
              box-shadow 150ms ease;
}

.btn-primary:active {
  transform: scale(0.97);
  background-color: #4F46E5;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}
```

### 图标按钮悬停

```css
.icon-btn {
  transition: background-color 150ms ease,
              transform 150ms ease;
}

.icon-btn:hover {
  background-color: #F8FAFC;
}

.icon-btn:active {
  transform: scale(0.92);
}
```

---

## 🃏 卡片动画

### 卡片选中效果

```css
.task-card {
  transition: transform 200ms ease-out,
              box-shadow 200ms ease-out,
              border-color 200ms ease-out;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-card.active {
  border-color: #6366F1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: scale(1.01);
}
```

### 卡片列表入场 (Stagger)

```css
.card-item {
  opacity: 0;
  transform: translateY(20px);
  animation: cardEnter 300ms ease-out forwards;
}

/* 依次延迟入场 */
.card-item:nth-child(1) { animation-delay: 0ms; }
.card-item:nth-child(2) { animation-delay: 50ms; }
.card-item:nth-child(3) { animation-delay: 100ms; }
.card-item:nth-child(4) { animation-delay: 150ms; }
/* ... */

@keyframes cardEnter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 🍅 番茄钟倒计时动画

### 进度环动画

```css
.progress-ring-fill {
  transition: stroke-dashoffset 1s linear,
              stroke 500ms ease;
}

/* 根据时间进度改变颜色 */
.progress-ring-fill.safe {
  stroke: #22C55E;  /* 绿色 >60% */
}

.progress-ring-fill.warning {
  stroke: #F59E0B;  /* 黄色 30-60% */
}

.progress-ring-fill.urgent {
  stroke: #EF4444;  /* 红色 <30% */
}
```

### 时间跳动效果

```css
.timer-number {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
```

### 倒计时结束庆祝

```css
/* 任务完成弹窗入场 */
.complete-modal {
  animation: celebrate 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes celebrate {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(50px);
  }
  50% {
    transform: scale(1.05) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 星星飞入动画 */
.star-fly {
  animation: starFly 600ms ease-out forwards;
}

@keyframes starFly {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.5);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px) scale(1.1);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
```

---

## ✅ 复选框动画

### 选中弹跳效果

```css
.checkbox {
  transition: background-color 150ms ease,
              border-color 150ms ease,
              transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.checkbox.checked {
  background-color: #22C55E;
  border-color: #22C55E;
  animation: checkBounce 200ms ease-out;
}

@keyframes checkBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 对勾绘制动画 */
.checkbox.checked::after {
  animation: checkDraw 150ms ease-out forwards;
}

@keyframes checkDraw {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
```

---

## 📊 骨架屏动画

### Shimmer 效果

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
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 🏆 成就动画

### 升级庆祝

```css
/* 等级提升弹窗 */
.level-up-modal {
  animation: levelUp 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes levelUp {
  0% {
    opacity: 0;
    transform: scale(0.8) rotate(-5deg);
  }
  50% {
    transform: scale(1.1) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

/* 星星旋转 */
.star-spin {
  animation: starSpin 1s ease-in-out;
}

@keyframes starSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  100% { transform: rotate(360deg) scale(1); }
}
```

### 奖励获得浮动文字

```css
.reward-float {
  position: absolute;
  animation: rewardFloat 800ms ease-out forwards;
}

@keyframes rewardFloat {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-40px) scale(0.9);
  }
}
```

---

## 🔔 Toast 提示动画

```css
.toast {
  animation: toastIn 300ms ease-out,
             toastOut 300ms ease-in 2s forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}
```

---

## 🧭 Tab 切换动画

### 下划线滑动

```css
.tab-indicator {
  transition: transform 200ms ease-out,
              width 200ms ease-out;
}

/* 使用 CSS transform 移动下划线位置 */
.tab-item[data-index="0"]:active ~ .tab-indicator {
  transform: translateX(0);
}

.tab-item[data-index="1"]:active ~ .tab-indicator {
  transform: translateX(100%);
}
```

---

## ⚡ 性能优化建议

### 使用 GPU 加速属性

```css
/* ✅ 推荐 - 使用 transform 和 opacity */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* 开启 GPU 加速 */
}

/* ❌ 避免 - 会触发重排 */
.animated-element {
  width: 100px;      /* 影响布局 */
  height: 100px;     /* 影响布局 */
  left: 100px;       /* 影响布局 */
  top: 100px;        /* 影响布局 */
}
```

### 减少动画元素

```css
/* 使用 contain 限制影响范围 */
.animated-container {
  contain: layout style paint;
}
```

###  prefers-reduced-motion 支持

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📱 React Native 动画参考

### 使用 Animated API

```javascript
import { Animated } from 'react-native';

// 淡入动画
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, []);

// 滑动动画
const slideAnim = useRef(new Animated.Value(100)).current;

Animated.spring(slideAnim, {
  toValue: 0,
  friction: 8,
  tension: 40,
  useNativeDriver: true,
}).start();
```

### 布局动画

```javascript
import { LayoutAnimation } from 'react-native';

// 列表项插入/删除动画
LayoutAnimation.configureNext(
  LayoutAnimation.Presets.easeInEaseOut
);
```

---

## 📱 Flutter 动画参考

### 隐式动画

```dart
// 动画容器
AnimatedContainer(
  duration: Duration(milliseconds: 200),
  curve: Curves.easeOut,
  width: isSelected ? 200 : 100,
  height: isSelected ? 100 : 50,
  color: isSelected ? Colors.blue : Colors.grey,
  child: child,
)

// 淡入淡出
AnimatedOpacity(
  opacity: visible ? 1.0 : 0.0,
  duration: Duration(milliseconds: 300),
  child: child,
)
```

### 显式动画

```dart
// Hero 动画 (页面间共享元素)
Hero(
  tag: 'task-${task.id}',
  child: TaskCard(task: task),
)

// 自定义动画
AnimationController(
  duration: Duration(milliseconds: 300),
  vsync: this,
);
```

---

## 📋 动画检查清单

- [ ] 所有动画时长 ≤ 300ms (庆祝动画除外)
- [ ] 使用 ease-out 或 ease-in-out 缓动函数
- [ ] 只动画 transform 和 opacity 属性
- [ ] 支持 prefers-reduced-motion
- [ ] 测试 60fps 流畅度
- [ ] 低端设备降级处理

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
