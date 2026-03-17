# TimeManagerApp - 页面路由表
> **Version**: 2.0  
> **Date**: 2026-03-16  
> **Platform**: Mobile Web (PWA) / React Native / Flutter

---

## 🗺️ 路由总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         登录/角色选择                            │
│                     / 或 /login                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
      ┌───────▼────────┐              ┌────────▼───────┐
      │    家长端       │              │    孩子端       │
      │   /parent/*    │              │   /child/*     │
      └───────┬────────┘              └────────┬───────┘
              │                                 │
    ┌─────────┼─────────┐           ┌───────────┼───────────┐
    │         │         │           │           │           │
┌───▼──┐  ┌──▼───┐ ┌──▼──┐      ┌───▼───┐  ┌──▼────┐ ┌──▼───┐
│ 首页 │  │ 计划 │ │ 排行│      │今日任务│  │ 成就  │ │ 休息 │
│      │  │      │ │     │      │        │  │       │ │      │
└──────┘  └──────┘ └─────┘      └────────┘  └───────┘ └──────┘
```

---

## 📱 详细路由表

### 公共路由 (Public Routes)

| 路由 | 页面名称 | 描述 | 参数 |
|------|----------|------|------|
| `/` 或 `/login` | 登录页 | 角色选择入口 | - |
| `/role-select` | 角色选择 | 选择家长/孩子身份 | - |

---

### 家长端路由 (Parent Routes)

| 路由 | 页面名称 | Tab 导航 | 主要功能 |
|------|----------|----------|----------|
| `/parent/home` | 家长首页 | 🏠 首页 (默认) | 查看孩子今日任务、习惯打卡状态 |
| `/parent/plan` | 计划管理 | 📋 计划 | 今日计划 Tab 默认 |
| `/parent/plan?tab=today` | 今日计划 | - | 查看今日任务+习惯列表 |
| `/parent/plan?tab=calendar` | 日历总览 | - | 月度日历视图 |
| `/parent/plan?tab=templates` | 场景模板 | - | 选择计划模板 |
| `/parent/ranking` | 本周评比 | 🏆 排行 | 查看周任务完成情况、星星排行 |
| `/parent/profile` | 个人中心 | 👤 我的 | 设置、个人信息 |

#### 家长端子页面 (非 Tab)

| 路由 | 页面名称 | 父级页面 | 功能 |
|------|----------|----------|------|
| `/parent/task/create` | 创建任务 | 计划管理 | 新建单个任务 |
| `/parent/task/edit/:id` | 编辑任务 | 计划管理 | 修改任务详情 |
| `/parent/habit/create` | 创建习惯 | 计划管理 | 新建习惯打卡 |
| `/parent/habit/edit/:id` | 编辑习惯 | 计划管理 | 修改习惯设置 |
| `/parent/template/:id` | 模板详情 | 场景模板 | 查看模板详情 |
| `/parent/template/create-from/:id` | 从模板创建 | 场景模板 | 使用模板生成计划 |
| `/parent/settings` | 设置页 | 个人中心 | 通知、隐私、账号设置 |
| `/parent/child-manage` | 孩子管理 | 个人中心 | 添加/切换孩子账号 |

---

### 孩子端路由 (Child Routes)

| 路由 | 页面名称 | Tab 导航 | 主要功能 | 屏幕方向 |
|------|----------|----------|----------|----------|
| `/child/tasks` | 今日任务 | 📝 任务 (默认) | 任务列表 + 番茄钟计时 | 横屏 |
| `/child/achievements` | 我的成就 | 🏅 成就 | 星星/月亮/太阳统计、历史 | 竖屏 |

#### 孩子端子页面 (非 Tab)

| 路由 | 页面名称 | 触发方式 | 功能 |
|------|----------|----------|------|
| `/child/task/:id/focus` | 专注模式 | 点击任务 | 全屏番茄钟计时 |
| `/child/task/complete` | 完成弹窗 | 任务完成 | 显示获得奖励 (Modal) |
| `/child/rest` | 休息模式 | 计时结束 | 休息提醒页面 |
| `/child/achievement/detail` | 成就详情 | 点击成就 | 历史记录详情 |

---

## 🔄 路由参数规范

### 任务相关参数

```typescript
// 任务编辑页
/parent/task/edit/:taskId
interface TaskEditParams {
  taskId: string;  // 任务唯一 ID
}

// 从模板创建
/parent/template/create-from/:templateId?date=2026-03-16
interface CreateFromTemplateParams {
  templateId: string;     // 模板 ID: 'daily-study' | 'exam-review' | 'vacation' | 'weekend'
  date?: string;          // 可选：指定日期 (YYYY-MM-DD)
}
```

### 计划管理 Tab 参数

```typescript
/parent/plan?tab=
type PlanTab = 'today' | 'calendar' | 'templates'
// 默认: 'today'
```

### 日历参数

```typescript
/parent/plan?tab=calendar&month=2026-03
calendarQuery: {
  month?: string;  // YYYY-MM 格式，默认当前月
  selected?: string;  // YYYY-MM-DD 选中的日期
}
```

---

## 🎭 路由权限控制

| 路由前缀 | 允许角色 | 未登录跳转 |
|----------|----------|-----------|
| `/parent/*` | 家长角色 | `/login` |
| `/child/*` | 孩子角色 | `/login` |
| `/` | 所有用户 | - |

---

## 📲 底部导航配置

### 家长端 BottomNav

```javascript
const parentNavItems = [
  { path: '/parent/home', label: '首页', icon: '🏠' },
  { path: '/parent/plan', label: '计划', icon: '📋' },
  { path: '/parent/ranking', label: '排行', icon: '🏆' },
  { path: '/parent/profile', label: '我的', icon: '👤' }
];
```

### 孩子端 BottomNav

```javascript
const childNavItems = [
  { path: '/child/tasks', label: '任务', icon: '📝' },
  { path: '/child/achievements', label: '成就', icon: '🏅' }
];
```

---

## 🌐 浏览器路由 vs 应用路由

### Web (PWA) 路由
```
https://timemanager.app/parent/home
https://timemanager.app/child/tasks
```

### React Native 路由 (React Navigation)
```javascript
// Stack Navigator 结构
RootStack
├── LoginScreen
├── RoleSelectScreen
├── ParentTabNavigator
│   ├── HomeScreen
│   ├── PlanScreen (内嵌 TopTab: Today/Calendar/Templates)
│   ├── RankingScreen
│   └── ProfileScreen
└── ChildTabNavigator
    ├── TasksScreen (横屏)
    └── AchievementsScreen
```

### Flutter 路由 (GoRouter)
```dart
final router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => LoginPage()),
    GoRoute(path: '/parent', builder: (_, __) => ParentShell(),
      routes: [
        GoRoute(path: 'home', builder: (_, __) => ParentHomePage()),
        GoRoute(path: 'plan', builder: (_, __) => PlanPage()),
        GoRoute(path: 'ranking', builder: (_, __) => RankingPage()),
        GoRoute(path: 'profile', builder: (_, __) => ProfilePage()),
      ],
    ),
    GoRoute(path: '/child', builder: (_, __) => ChildShell(),
      routes: [
        GoRoute(path: 'tasks', builder: (_, __) => TasksPage()),
        GoRoute(path: 'achievements', builder: (_, __) => AchievementsPage()),
      ],
    ),
  ],
);
```

---

## 📝 路由命名规范

- **路径**: 全小写，连字符分隔 (`/parent/task/create`)
- **参数**: 驼峰命名 (`:taskId`, `:templateId`)
- **Query**: 驼峰命名 (`?selectedDate=2026-03-16`)

---

## 🔄 页面转场规则

| 场景 | 转场方式 | 方向 | 时长 |
|------|----------|------|------|
| Tab 切换 | 无动画 | - | - |
| 进入子页面 | 滑动 | 从右向左 | 300ms |
| 返回上级 | 滑动 | 从左向右 | 300ms |
| Modal 弹出 | 淡入 + 底部滑入 | 从下到上 | 250ms |
| Modal 关闭 | 淡出 + 底部滑出 | 从上到下 | 200ms |

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
