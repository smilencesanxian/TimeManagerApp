# 开发进度记录 (Claude 记忆文件)

> ⚠️ 此文件是 Claude 的核心记忆。每次 Session 开始时必须先读此文件，每次 Phase 完成后必须更新。

---

## 快速恢复清单（新 Session 必读）

```
项目：AI时间管理APP（家长+孩子）
技术栈：Node.js+Express+TypeScript (后端) / Taro4+React18+TypeScript (前端)
数据库：SQLite (开发) via Prisma
工作目录：/mnt/d/ClaudeCodes/TimeManagerApp-web/
后端目录：backend/   前端目录：miniapp/
后端启动：cd backend && npm run dev  （端口 3000）
```

### 立即可做的操作
```bash
# 验证后端测试全通过（30个）
cd backend && npm test

# 验证前端类型检查通过
cd miniapp && node_modules/typescript/bin/tsc --noEmit
```

---

## 当前进度

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | 项目基础 & 认证 | ✅ 已完成 |
| Phase 2 | 任务管理 + WebSocket | ✅ 已完成 |
| Phase 3 | 番茄钟计时器 | ✅ 已完成 |
| Phase 4 | 习惯打卡 | ✅ 已完成 |
| Phase 4.5 | 成就系统（奖励体系） | ✅ 已完成 |
| Phase 5.1 | AI任务解析 + AI评语推荐 | ✅ 已完成 |
| Phase 5 | AI集成（DashScope 完整） | 🚧 进行中 |
| Phase 6 | 家长端完整功能 | 🔒 未开始 |
| Phase 7 | 微信小程序打包 | 🔒 未开始 |

---

## Phase 1 完成详情 ✅

### 后端已实现接口
| 方法 | 路径 | 功能 | 测试 |
|------|------|------|------|
| POST | /api/v1/auth/register | 手机号注册 | ✅ |
| POST | /api/v1/auth/login | 手机号登录 | ✅ |
| POST | /api/v1/auth/wechat-login | 微信登录(Mock/真实) | ✅ |
| POST | /api/v1/auth/refresh | 刷新Token | ✅ |
| POST | /api/v1/auth/logout | 登出 | ✅ |
| GET  | /api/v1/auth/me | 获取当前用户 | ✅ |
| PUT  | /api/v1/auth/role | 设置用户角色 | ✅ |
| POST | /api/v1/auth/invite | 家长生成邀请码 | - |
| POST | /api/v1/auth/bind | 孩子绑定邀请码 | - |
| GET  | /api/v1/health | 健康检查 | ✅ |

### 前端已实现页面
| 页面路径 | 内容 |
|---------|------|
| pages/login/index | 登录/注册（微信+手机号） |
| pages/parent/home/index | 家长首页骨架 |
| pages/parent/plan/index | 占位页 |
| pages/parent/ranking/index | 占位页 |
| pages/parent/profile/index | 占位页 |
| pages/child/tasks/index | 孩子任务页骨架 |
| pages/child/achievements/index | 占位页 |

### 数据库表（已 migrate）
- users, families, tasks, pomodoro_sessions
- achievements, notifications, refresh_tokens

---

## 关键技术决策（坑点记录）

| 问题 | 解决方案 |
|------|---------|
| JWT同一秒内生成重复导致唯一约束冲突 | JWT payload 加 jti: uuidv4() |
| 集成测试数据库数据残留 | beforeAll 用 `prisma migrate reset --force --skip-seed` |
| Taro CLI 交互式无法非交互执行 | 手动创建项目结构和 package.json |
| Taro 类型声明 strict 不兼容 | tsconfig 加 skipLibCheck: true |
| miniapp/.bin/tsc 软链接在 Windows 盘失效 | 用 `node_modules/typescript/bin/tsc` |
| npm install 在 /mnt/d/ 原子重命名失败 | 第一次安装部分失败后重试即可，包已安装 |

---

## 环境配置

### 敏感配置（backend/.env）
```
WECHAT_APP_ID=wxfc461e2b727f0e9f   # ✅ 已填
WECHAT_APP_SECRET=                  # ⚠️ 待填（Phase 7 打包时需要）
DASHSCOPE_API_KEY=sk-4307c...       # ✅ 已填
JWT_SECRET=dev-jwt-secret-change-in-production
DATABASE_URL=file:./dev.db
PORT=3000
```

### 需要 sudo 安装的依赖
```bash
# Playwright E2E 测试（Phase 1 前端测试时需要）
sudo npx playwright install-deps chromium
```
已安装：✅（libnss3 libdrm2 libgbm1 libatk-bridge2.0-0t64 libatk1.0-0t64 libcups2t64 等）
注意：Ubuntu新版包名加了t64后缀，libatk/libcups需用带t64的版本

---

## Phase 2 完成详情 ✅

### 后端已实现接口
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/v1/tasks | 创建任务（家长） |
| GET | /api/v1/tasks | 查询任务列表 |
| GET | /api/v1/tasks/today | 今日任务 |
| GET | /api/v1/tasks/:id | 获取单个任务 |
| PUT | /api/v1/tasks/:id | 更新任务（家长） |
| PUT | /api/v1/tasks/:id/status | 更新状态（家长/孩子） |
| DELETE | /api/v1/tasks/:id | 删除任务（家长） |

### WebSocket 事件
- `task:created` — 新任务广播到孩子
- `task:status_changed` — 状态变更广播到家长
- `task:deleted` — 删除广播到孩子
- 路径：`/ws/?EIO=4&transport=websocket`

### 前端已实现
- `src/services/api.ts` — taskApi（7个接口）
- `src/services/wsClient.ts` — socket.io v4 协议最小客户端
- `src/store/taskStore.ts` — Zustand 任务状态管理
- `pages/parent/home/index.tsx` — 家长任务看板（列表+统计+添加弹窗+删除）
- `pages/child/tasks/index.tsx` — 孩子今日任务列表（状态切换+WS实时更新）

### 关键修复
- `bindWithInviteCode` 之前只返回数据未写入DB，已修复为真正更新 family 记录
- socket.io-client 未安装，用 Taro.connectSocket 手写最小 EIO4 协议客户端

### 测试
- 后端 59/59 全通过（含25个 tasks 集成测试 + 4个 WS 单元测试）
- 前端 TypeScript 类型检查通过（无任何错误）

---

## Phase 3 完成详情 ✅

### 后端新增接口
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/v1/tasks/:id/pomodoro/start | 启动番茄钟 session |
| POST | /api/v1/pomodoro/sessions/:id/end | 结束 session |
| GET  | /api/v1/tasks/:id/pomodoro/sessions | 查询任务所有 sessions |
| GET  | /api/v1/tasks/:id/pomodoro/summary | 专注数据汇总 |

### 前端新增
- `src/hooks/usePomodoroTimer.ts` — 番茄钟状态机 hook（idle/focusing/paused/onBreak/breakDone/completed）
- `pages/child/pomodoro/index.tsx` — 番茄钟计时页面（含完成确认弹窗 + 庆祝动画）
- `src/services/api.ts` — 新增 pomodoroApi（4个方法）
- 登录页、任务列表页加 data-testid，任务列表点击跳转到番茄钟页

### 测试框架（Phase 3 新建）
- Jest + React Testing Library（前端单元测试）
- Playwright E2E（H5 build，webServer 自动启动）
- `e2e/global-setup.ts` — E2E 测试数据准备脚本

### 测试结果
- 后端集成测试：78/78 ✅
- 前端单元测试：12/12 ✅
- E2E 测试：5/5 ✅

### 关键坑点记录
| 问题 | 解决方案 |
|------|---------|
| Taro H5 Input 渲染为 taro-input-core | Playwright 用 `[data-testid="x"] input` 定位内部 input |
| webpack-dev-server overlay 拦截点击 | config/dev.js 加 `devServer.client.overlay: false` |
| ajv v6/v8 版本冲突导致 H5 启动崩溃 | npm install ajv@^8 --legacy-peer-deps |
| Taro H5 使用 hash 路由 | E2E 测试 goto 改为 `/#/pages/...` |

---

## Phase 4 完成详情 ✅

### 后端新增接口
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/v1/habits | 创建习惯（家长） |
| GET  | /api/v1/habits | 查询习惯列表（支持 childId 筛选） |
| GET  | /api/v1/habits/:id | 获取单个习惯 |
| PUT  | /api/v1/habits/:id | 编辑习惯 |
| DELETE | /api/v1/habits/:id | 删除习惯 |
| POST | /api/v1/habits/:id/checkin | 打卡 |
| DELETE | /api/v1/habits/:id/checkin | 取消打卡 |
| GET  | /api/v1/habits/:id/checkin/today | 查询今日打卡状态 |

### 前端新增页面/组件
| 路径 | 内容 |
|------|------|
| pages/parent/habit/create/index.tsx | 家长创建习惯页 |
| pages/parent/habit/edit/index.tsx | 家长编辑习惯页 |
| pages/parent/plan/index.tsx | 计划管理页（含习惯 Tab） |
| pages/parent/home/index.tsx | 家长首页新增习惯打卡区块 |
| pages/child/tasks/index.tsx | 孩子今日任务页含习惯打卡列表 |
| store/habitStore.ts | Zustand 习惯状态管理 |

### 测试结果
- 后端集成测试：118/118 ✅
- 前端 TypeScript 类型检查：通过 ✅
- E2E 测试：17/17 ✅

### 关键坑点记录
| 问题 | 解决方案 |
|------|---------|
| create/edit页save后navigateBack无历史 | 改为`redirectTo('/pages/parent/plan/index?tab=habits')` |
| plan页fetchHabits无childId（后端400） | useDidShow自动调用getChildren获取第一个孩子的ID |
| 家长首页习惯区是占位符 | 引入useHabitStore渲染真实习惯列表（含data-habit-id） |
| E2E多轮测试习惯数据累积导致strict mode | global-setup每次清空child的历史习惯数据 |
| Taro H5 navigateTo后旧页面留在DOM里 | 测试选择器用.last()取active页的元素 |
| Taro `<Text>`渲染为taro-text+taro-text-core双层 | 改用data-habit-name属性选择器代替text=匹配 |

---

## Phase 4.5 成就系统开发详情 🚧

### 已完成：后端 ✅

#### 新增文件
| 文件 | 内容 |
|------|------|
| `backend/src/repositories/achievementRepository.ts` | DB操作（findOrCreate/addStars/getTotal/setTotal/getHistory） |
| `backend/src/services/achievementService.ts` | 业务逻辑（含导出纯函数供单元测试） |
| `backend/src/routes/achievements.ts` | 5个路由 |
| `backend/tests/unit/achievementService.test.ts` | 16个单元测试（TDD先写） |
| `backend/tests/integration/achievements.test.ts` | 19个集成测试（TDD先写） |

#### 新增接口
| 方法 | 路径 | 功能 |
|------|------|------|
| GET  | /api/v1/achievements/summary | 返回stars/moons/suns/level/levelTitle/starsToNextLevel |
| GET  | /api/v1/achievements/history | 按月返回每日星星历史（calendar用） |
| GET  | /api/v1/achievements/weekly  | 本周星星/月亮统计 |
| POST | /api/v1/achievements/debug/set-stars | 调试：强制设置raw stars（家长权限） |
| POST | /api/v1/achievements/debug/set-rewards | 调试：按stars/moons/suns设置（家长权限） |

#### 核心逻辑
- `Achievement` 表：每天一条记录，`stars` 存当日原始星星数
- 汇总时：`totalRaw = SUM(stars)`，换算 `suns=floor(raw/100)`, `moons=floor(raw%100/10)`, `stars=raw%10`
- 任务完成（首次）→ +1星（`taskService.updateTaskStatus`）
- 习惯打卡 → +rewardStars 星（`habitService.checkIn`）
- 等级规则：Lv1(0-9) / Lv2(10-24) / Lv3(25-44) / Lv4(45-69) / Lv5(70+)
- 后端测试：**153/153** ✅（含新增35个）

### 已完成：前端（部分）

#### 新增/修改文件
| 文件 | 内容 |
|------|------|
| `miniapp/src/services/api.ts` | 新增 `achievementApi`（getSummary/getHistory/getWeekly） |
| `miniapp/src/app.config.ts` | 新增 `pages/child/achievement/detail/index` 注册 |
| `miniapp/src/pages/child/achievements/index.tsx` | 成就页实现（等级/进度条/星月太阳/本周统计/历史日历按钮） |
| `miniapp/src/pages/child/achievement/detail/index.tsx` | 成就历史月历页（新建） |
| `miniapp/src/pages/child/tasks/index.tsx` | 顶部加星月太阳(含正确testid+点击跳转) / 打卡后刷新成就 |
| `miniapp/src/pages/child/pomodoro/index.tsx` | 完成弹窗加completion-star-reward / daily-complete-bonus |
| `miniapp/src/pages/parent/home/index.tsx` | 加孩子成就横幅（含child-stars-display） |

#### TypeScript 类型检查
```bash
$ node_modules/typescript/bin/tsc --noEmit
（无任何输出）✅
```

### Phase 4.5 完成 ✅

#### E2E 测试结果：21/21 全通过
- 全套 E2E（58个）无回归

---

## Phase 5.1 AI任务解析开发详情 🚧

### 已完成

#### 后端 ✅

| 文件 | 内容 |
|------|------|
| `backend/src/services/aiService.ts` | DashScope调用 + 规则降级（parseTask/parseTaskByAI/parseTaskByRule） |
| `backend/src/routes/ai.ts` | POST /api/v1/ai/parse-task（仅parent权限） |
| `backend/src/routes/index.ts` | 注册 /ai 路由 |
| `backend/tests/unit/aiService.test.ts` | 23个单元测试（TDD先写） |
| `backend/tests/integration/ai.test.ts` | 9个集成测试（TDD先写） |

#### 新增接口
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/v1/ai/parse-task | 接收自然语言描述，返回{subject,title,duration,priority} |

#### 核心逻辑
- 主路径：调用 DashScope `qwen-turbo`（兼容OpenAI格式），使用 `global.fetch`，10秒超时
- 降级路径：DashScope 失败时自动规则解析（关键词匹配学科 + 正则提取时长）
- 学科识别顺序：数学 → 英语 → 语文 → 运动 → 阅读 → 其他（英语排在语文前，防止"英语背诵"误判为语文）
- 后端测试：**185/185** ✅（含新增32个）

#### 前端（部分完成）⚠️
- `miniapp/src/services/api.ts` 新增 `aiApi.parseTask()`
- `miniapp/src/pages/parent/home/index.tsx` 加入 AI 识别按钮（临时方案）
- ⚠️ 待按 E2E 规范重构弹窗 UI（需要完整 testid 体系 + 自动触发解析）

#### E2E 规范要求的 testid（待实现）
| testid | 用途 |
|--------|------|
| `quick-add-task-modal` | 添加任务弹窗容器 |
| `input-task-desc` | AI自然语言描述输入框 |
| `ai-parse-result` | AI识别成功后的结果区域 |
| `ai-subject-tag` | 识别出的学科标签 |
| `ai-estimated-duration` | 识别出的预估时长 |
| `ai-parse-fallback` | AI失败时的降级提示（含"请手动选择"文字） |
| `subject-option-{学科}` | 各学科选项标签 |
| `input-task-duration` | 时长输入框 |
| `btn-confirm-add-task` | 确认添加按钮 |

---

## 文件结构快照

```
TimeManagerApp-web/
├── CLAUDE.md                    # 项目规范（不修改）
├── PROGRESS.md                  # 本文件（Claude记忆）
├── docs/                        # 产品/UX文档（不修改）
├── backend/
│   ├── src/
│   │   ├── routes/auth.ts       # 认证路由
│   │   ├── services/authService.ts
│   │   ├── repositories/userRepository.ts
│   │   ├── middleware/{auth,errorHandler}.ts
│   │   └── utils/{jwt,logger}.ts
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型
│   │   └── migrations/          # 已执行的migration
│   └── tests/{unit,integration}/
└── miniapp/
    ├── src/
    │   ├── app.tsx / app.config.ts / app.scss
    │   ├── global.d.ts          # scss模块/全局常量类型声明
    │   ├── pages/               # 7个页面
    │   ├── store/authStore.ts   # Zustand认证状态
    │   └── services/api.ts      # HTTP请求封装
    └── config/{index,dev,prod}.js
```
