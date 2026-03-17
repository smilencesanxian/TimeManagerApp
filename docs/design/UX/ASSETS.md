# TimeManagerApp - 图片资源清单
> **Version**: 2.0  
> **Date**: 2026-03-16

---

## 📁 资源目录结构

```
assets/
├── icons/                      # 图标 (SVG)
│   ├── navigation/             # 导航图标
│   ├── actions/                # 操作图标
│   └── subjects/               # 学科图标
├── illustrations/              # 插图 (PNG/SVG)
│   ├── empty-states/           # 空状态插图
│   ├── achievements/           # 成就徽章
│   └── onboarding/             # 引导页插图
├── images/                     # 图片 (PNG/WebP)
│   ├── avatars/                # 默认头像
│   └── backgrounds/            # 背景图
└── animations/                 # Lottie JSON
    └── celebrations/           # 庆祝动画
```

---

## 🎯 图标资源 (SVG)

### 导航图标 (24px)

| 文件名 | 用途 | 尺寸 | 状态 |
|--------|------|------|------|
| `nav-home.svg` | 首页 Tab | 24×24 | active: #6366F1, inactive: #94A3B8 |
| `nav-plan.svg` | 计划 Tab | 24×24 | 同上 |
| `nav-ranking.svg` | 排行 Tab | 24×24 | 同上 |
| `nav-profile.svg` | 我的 Tab | 24×24 | 同上 |
| `nav-tasks.svg` | 任务 Tab (孩子端) | 24×24 | 同上 |
| `nav-achievements.svg` | 成就 Tab (孩子端) | 24×24 | 同上 |

### 操作图标 (20-24px)

| 文件名 | 用途 | 尺寸 | 颜色 |
|--------|------|------|------|
| `icon-add.svg` | 添加/新建 | 24×24 | #1E293B |
| `icon-edit.svg` | 编辑 | 20×20 | #64748B |
| `icon-delete.svg` | 删除 | 20×20 | #EF4444 |
| `icon-check.svg` | 完成/勾选 | 16×16 | #FFFFFF (在绿色背景上) |
| `icon-close.svg` | 关闭 | 20×20 | #64748B |
| `icon-back.svg` | 返回 | 24×24 | #1E293B |
| `icon-more.svg` | 更多选项 | 24×24 | #64748B |
| `icon-settings.svg` | 设置 | 24×24 | #64748B |
| `icon-notification.svg` | 通知 | 24×24 | #64748B |
| `icon-calendar.svg` | 日历 | 20×20 | #64748B |
| `icon-clock.svg` | 时钟/时间 | 20×20 | #64748B |
| `icon-fire.svg` | 连续打卡 | 16×16 | #F59E0B |
| `icon-star.svg` | 星星 | 24×24 | #FBBF24 |
| `icon-moon.svg` | 月亮 | 24×24 | #A78BFA |
| `icon-sun.svg` | 太阳 | 24×24 | #F59E0B |

### 学科图标 (20px)

| 文件名 | 用途 | 尺寸 | 背景色 |
|--------|------|------|--------|
| `subject-math.svg` | 数学 | 20×20 | #3B82F6 |
| `subject-chinese.svg` | 语文 | 20×20 | #22C55E |
| `subject-english.svg` | 英语 | 20×20 | #F59E0B |
| `subject-other.svg` | 其他 | 20×20 | #A855F7 |

### 习惯图标 (Emoji 备选方案)

| 图标 | 用途 | 说明 |
|------|------|------|
| 🌱 | 成长类习惯 | 可直接使用系统 Emoji |
| 📚 | 阅读 | 可直接使用系统 Emoji |
| 🏃 | 运动 | 可直接使用系统 Emoji |
| 🎨 | 艺术 | 可直接使用系统 Emoji |
| 🎵 | 音乐 | 可直接使用系统 Emoji |
| 🧹 | 家务 | 可直接使用系统 Emoji |
| 🛏️ | 早睡 | 可直接使用系统 Emoji |
| 🥗 | 饮食 | 可直接使用系统 Emoji |

---

## 🖼️ 插图资源

### 空状态插图 (200×150px)

| 文件名 | 用途 | 尺寸 | 格式 |
|--------|------|------|------|
| `empty-tasks.svg` | 暂无任务 | 200×150 | SVG |
| `empty-habits.svg` | 暂无习惯 | 200×150 | SVG |
| `empty-plan.svg` | 暂无计划 | 200×150 | SVG |
| `empty-history.svg` | 暂无历史 | 200×150 | SVG |
| `empty-search.svg` | 搜索无结果 | 200×150 | SVG |
| `empty-network.svg` | 网络错误 | 200×150 | SVG |

**设计风格**: 扁平插画，主色调 #6366F1 搭配灰色系

### 成就徽章 (64×64px)

| 文件名 | 用途 | 尺寸 | 格式 |
|--------|------|------|------|
| `badge-star.svg` | 星星徽章 | 64×64 | SVG |
| `badge-moon.svg` | 月亮徽章 | 64×64 | SVG |
| `badge-sun.svg` | 太阳徽章 | 64×64 | SVG |
| `badge-level-1.svg` | 等级 1 | 64×64 | SVG |
| `badge-level-2.svg` | 等级 2 | 64×64 | SVG |
| `badge-level-3.svg` | 等级 3 | 64×64 | SVG |
| `badge-level-4.svg` | 等级 4 | 64×64 | SVG |
| `badge-level-5.svg` | 等级 5 | 64×64 | SVG |

### 引导页插图 (320×240px)

| 文件名 | 用途 | 尺寸 | 格式 |
|--------|------|------|------|
| `onboarding-1.svg` | 欢迎页 | 320×240 | SVG |
| `onboarding-2.svg` | 家长功能介绍 | 320×240 | SVG |
| `onboarding-3.svg` | 孩子功能介绍 | 320×240 | SVG |

---

## 👤 头像资源

### 默认头像 (64×64px)

| 文件名 | 用途 | 尺寸 | 格式 |
|--------|------|------|------|
| `avatar-default-parent.svg` | 家长默认头像 | 64×64 | SVG |
| `avatar-default-child-boy.svg` | 男孩默认头像 | 64×64 | SVG |
| `avatar-default-child-girl.svg` | 女孩默认头像 | 64×64 | SVG |

### 头像装饰框 (可选)

| 文件名 | 用途 | 尺寸 |
|--------|------|------|
| `avatar-frame-vip.svg` | VIP 用户 | 68×68 |

---

## 🎬 Lottie 动画

### 庆祝动画

| 文件名 | 用途 | 尺寸 | 时长 |
|--------|------|------|------|
| `celebration-confetti.json` | 任务完成庆祝 | 200×200 | 2s |
| `celebration-stars.json` | 获得星星 | 150×150 | 1.5s |
| `celebration-level-up.json` | 升级庆祝 | 200×200 | 2.5s |
| `celebration-trophy.json` | 排行榜第一 | 200×200 | 2s |

### 功能动画

| 文件名 | 用途 | 尺寸 | 时长 |
|--------|------|------|------|
| `loading-spinner.json` | 加载中 | 48×48 | 1s (循环) |
| `pull-to-refresh.json` | 下拉刷新 | 40×40 | 1.5s |
| `success-check.json` | 成功勾选 | 48×48 | 0.8s |

---

## 🎨 设计规范

### 图标设计原则

1. **线条风格**: 2px 描边，圆角端点
2. **视觉大小**: 20px/24px 图标在视觉中心区域内
3. **颜色**: 单色图标，通过 CSS 改变颜色
4. **一致性**: 所有图标保持相同的视觉权重

### 图标设计模板

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### 插图风格指南

- **风格**: 扁平插画，简洁线条
- **主色**: #6366F1 (品牌色)
- **辅色**: #F8FAFC, #E2E8F0 (中性色)
- **点缀色**: #22C55E, #F59E0B, #EF4444 (语义色)

---

## 📦 资源导出规格

### SVG 导出设置

| 设置 | 值 |
|------|-----|
| 保留编辑性 | 否 |
| 压缩 | 是 |
| 小数精度 | 2 |
| CSS 属性 | presentation 属性 |

### PNG 导出设置

| 场景 | 尺寸 | DPI |
|------|------|-----|
| @1x | 原始尺寸 | 72 |
| @2x | 2× 原始尺寸 | 144 |
| @3x | 3× 原始尺寸 | 216 |

### WebP 导出设置

| 设置 | 值 |
|------|-----|
| 质量 | 85% |
| 有损压缩 | 是 |
| 透明度 | 保留 |

---

## 🔧 使用示例

### React

```jsx
import { ReactComponent as HomeIcon } from './assets/icons/navigation/nav-home.svg';

function BottomNav() {
  return (
    <nav>
      <HomeIcon className="nav-icon" />
    </nav>
  );
}
```

### React Native

```javascript
import HomeIcon from './assets/icons/nav-home.svg';

// 使用 react-native-svg
<HomeIcon width={24} height={24} color={isActive ? '#6366F1' : '#94A3B8'} />
```

### Flutter

```dart
import 'package:flutter_svg/flutter_svg.dart';

SvgPicture.asset(
  'assets/icons/nav-home.svg',
  width: 24,
  height: 24,
  color: isActive ? Color(0xFF6366F1) : Color(0xFF94A3B8),
);
```

---

## ✅ 资源检查清单

- [ ] 所有图标提供 SVG 格式
- [ ] 图标提供 24px 和 20px 两种尺寸
- [ ] 所有图标可通过 CSS 变色 (使用 currentColor)
- [ ] 插图提供 SVG 和 PNG@2x 两种格式
- [ ] Lottie 动画已压缩优化
- [ ] 所有资源已命名规范 (kebab-case)

---

## 📝 备注

1. **图标来源建议**:
   - [Lucide Icons](https://lucide.dev/) - 推荐，风格匹配
   - [Heroicons](https://heroicons.com/) - 备选
   - [Feather Icons](https://feathericons.com/) - 备选

2. **插图来源建议**:
   - 使用 Midjourney / DALL-E 生成
   - 或使用 [unDraw](https://undraw.co/) 修改配色

3. **Lottie 来源建议**:
   - [LottieFiles](https://lottiefiles.com/)
   - 使用 After Effects + Bodymovin 自行制作

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
