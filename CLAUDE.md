# 项目名称：AI时间管理闹钟APP

## 项目概述
这是一个帮助个人更好的进行时间管理的APP，目标用户是时间管理比较差的小朋友，核心价值是辅助用户更好的做好时间管理。
整体设计围绕“**家长轻松规划、孩子自主执行、AI智能辅助**”的理念，突出**任务计时与番茄钟的智能联动**，兼顾习惯养成与正向激励。


## 功能设计
产品文档路径如下：
docs/design/product/PRD-v2.2.md

## UI设计
完整UI设计文档路径，包含了详细的UCD设计，前端开发时必须要仔细阅读
docs/design/UX
前端页面开发一定要按照UX设计来实现，不要自己随意发挥，如果有改动需要明确提出来
UI页面和跳转方案文件都在docs/design/UX/UI目录中
UI页面实现规范细节都在docs/design/UX/目录中

## 核心开发规范（非常重要）

### 通用规范
- 每个新功能必须在对应 __tests__ 目录写单元测试，并且要在开发之前先把测试用例写好，需要确保测试用例都通过才算真正开发完成
- 每个包含前端页面的功能必须写E2E测试用例，并且要再开发之前先把测试用例写好，需要确保测试用例都通过才算真正开发完成
- 始终通过 Context7 MCP 获取任何第三方库（如 React, Tailwind, Next.js 等）的最新官方文档和代码示例。
- 在进行代码生成、配置或 API 调用前，自动调用 Context7 检索当前版本的 API 规范，无需我显式要求。
- TypeScript 严格模式：所有 RN 组件 props 必须定义 interface，禁止使用 any
- Python 类型注解：所有函数必须有完整类型注解，使用 Pydantic v2 做数据验证
- 组件必须使用 TypeScript，props 必须定义 interface
- 异步操作统一使用 async/await，禁止裸 Promise.then
- 错误处理：API 调用必须有 try/catch（RN 端）或 try/except（Python 端）
- 命名：
    RN 组件：PascalCase（UserCard.tsx）
    RN 函数：camelCase
    Python 文件/函数：snake_case（user_service.py）
    常量：UPPER_SNAKE_CASE
    数据库表名：复数 + snake_case（user_profiles）
- 提交前必须：无 TypeScript 编译错误，无 Python lint 错误
- 开发完成后需要同步生成/更新当前项目进展和状态

### React Native 规范
- 样式统一用 `StyleSheet.create()`，禁止内联样式对象
- 颜色、字体、间距使用 `src/theme/` 中的设计 token，禁止硬编码
- 家长端和孩子端**共享组件**放在独立的 `shared/` 目录
- 每个页面对应一个目录：`screens/Login/index.tsx` + `screens/Login/styles.ts`
- **所有可交互元素和关键展示区域必须加 `data-testid`**，包括：按钮、输入框、Modal 容器、列表项、状态展示区域。命名规则：`动词-名词`（如 `btn-confirm-add-task`）或 `名词-类型`（如 `input-task-desc`、`task-list`）。E2E 测试必须通过 testid 定位元素，不允许依赖 CSS 类名或文字内容。

### FastAPI 规范
- Router 按业务模块拆分，统一注册到 `app/api/v1/router.py`
- 业务逻辑必须在 Service 层，Router 只做参数接收和响应格式化
- 数据库操作必须在 Repository 层（不允许在 Router 直接写 SQL）
- 所有接口必须有 Response Model（Pydantic Schema）
- 数据库 migration 必须先展示 SQL 给我确认，再执行

## 输出规范（节省token）
- 修改已有代码时，只输出修改的部分，用注释标明位置

  正确示例：
  # 修改 backend/app/services/auth.py 第45行
  # 将原来的 verify_password 改为：
  def verify_password(plain, hashed):
      return bcrypt.checkpw(...)

- 禁止重复输出没有变化的代码块
- 禁止在回复开头复述我说的需求内容
- 解释说明控制在5行以内，直接给结论，不要过程推导
- 不需要在每次回复结尾总结"我完成了什么"

---
## 重要约束
- 所有代码文件保存在当前代码目录下面，且不能直接删除除当前目录以及子目录之外的所有文件，不要修改 docs/ 目录下已有文档，除非我明确要求更新
- 数据库 migration 执行前必须先展示完整 SQL 给我确认，必须经过我确认再执行
- 第三方 SDK 选型需先问我，第三方 SDK/库引入前先告诉我，不要直接 npm install
- AI API 密钥 等敏感信息只写在 .env 文件，绝对不能硬编码进代码
- 跨端共享逻辑（如工具函数、类型定义）要放在 shared/ 或专门的 package，不要在两个 App 里各写一遍
- 在执行过程中如果有其他疑问，请向我提问,以明确该产品的功能需求、技术需求、工程原则以及硬性限制等
- 每次只做一个功能模块，完成后等我确认再继续
- 每次测试发现的问题，解决完成后要添加到测试用例进行看护，避免相同的问题重复产生

## 自测工作流（Claude 必须遵守）

5. 发现问题自行修复，修复后重新测试
6. 全部通过后才来告诉我结果
7. 每次测试发现的问题，解决完成后要添加到测试用例进行看护，避免相同的问题重复产生

## Claude 的自主测试权限

- ✅ 可以自主启动/重启本地服务
- ✅ 可以自主执行数据库 migration（开发环境）
- ✅ 可以自主运行测试脚本和 curl 命令
- ✅ 发现 bug 可以自行修复，不需要每次问我
- ❌ 不能修改 .env 文件中的配置
- ❌ 不能操作生产环境的任何资源
- ⚠️ 如果修复方案涉及架构变动，必须先告诉我

## 🚨 测试完成标准（唯一标准）

**"我觉得没问题"不算完成。"测试用例通过了"不算完成。**
**只有以下两项输出同时存在，才算完成。**

---

### 后端功能完成时，必须在回复中粘贴：

**① TypeScript/Python 类型检查通过**
```bash
$ cd backend && python -m mypy app/ --strict
Success: no issues found
```

**② 冒烟测试真实输出**
```bash
$ python scripts/smoke_test.py
✅ 服务健康检查
✅ 未登录访问受保护接口应返回401
✅ [本次新增的用例名称]
共 X 项全部通过 ✅
```

同时，本次新增的接口必须已追加到 smoke_test.py 对应模块中。
---

### React Native 功能完成时，必须在回复中粘贴：

**① 类型检查通过**
```bash
$ npx tsc --noEmit
（无任何输出）
```

**② 高频错误自查结果**（逐项回答 是/否）
- 新页面是否已注册到导航栈？
- useEffect 依赖数组是否经过检查？
- API base URL 在模拟器环境下是否使用机器IP而非localhost？
- 所有 TODO / console.log 是否已清理？

---

### 每次只做一个接口或一个页面

完成 → 粘贴证据 → 等我确认 → 再做下一个。
禁止一次提交多个接口或页面。
```

---

## 📊 开发进度
### 后端（Backend）
- [x] 项目初始化 & Docker 环境
- [x] 数据库模型设计（User, ParentProfile, KidProfile）
- [x] 用户认证（注册/登录/JWT/刷新 Token）
- [x] 家长-孩子绑定关系
- [x] 任务管理 CRUD（tasks, pomodoro_sessions）
- [x] WebSocket 实时通知（连接管理器、任务状态广播、评语广播）
- [x] AI 任务解析（DashScope + 规则降级）
- [x] 家长评语系统（parent_comments）
- [x] 成就奖励系统（daily_achievements）
- [x] 学习数据统计接口
- [x] 知识库管理（RAG + LangChain + pgvector）
- [x] 每日/每周 AI 总结（周报、闪光点）
- [x] 睡眠提醒 / 时间预警
- [x] Push 通知集成

### 家长端（ParentApp）
- [x] 项目初始化 & 导航结构
- [x] 登录 / 注册 / 忘记密码页面
- [x] 首页（孩子学习看板、任务统计）
- [x] 创建任务页（AI 解析）
- [x] 临时作业推送（Modal）
- [x] 发送心语评语
- [x] WebSocket 实时同步
- [x] 计划管理（任务+习惯Tab）
- [x] 设置页（个人中心+设置+孩子管理）
- [x] 本周评比页（任务/习惯/星星统计）

### 孩子端（KidApp）
- [x] 项目初始化 & 导航结构
- [x] 登录 & 家长邀请码绑定
- [x] 首页（任务列表、奖励系统、家长评语）
- [x] 任务详情 & 番茄钟计时器
- [x] WebSocket 实时同步（new_task / parent_comment）
- [x] 成就 / 激励系统（真实 API 数据）
- [x] 心语墙页面
- [x] 心语墙TabBar入口

---

## 📋 Phase 6 开发计划（MVP补全）

### Step 1：孩子端TabBar补充心语入口 ✅
- 文件：`miniapp/src/app.config.ts`
- 改动：TabBar新增心语Tab（页面已有）

### Step 2：家长端个人中心页（profile）✅
- 新建：`miniapp/src/pages/parent/profile/index.tsx`
- 展示家长昵称、绑定孩子列表、跳转到设置/孩子管理入口

### Step 3：家长端设置页（settings）✅
- 新建：`miniapp/src/pages/parent/settings/index.tsx`（主菜单）
- 新建：`miniapp/src/pages/parent/settings/schedule/index.tsx`（作息设置）
- 新建：`miniapp/src/pages/parent/settings/notification/index.tsx`（通知设置）
- 功能：账号信息、作息设置（睡觉时间）、通知开关、退出登录

### Step 4：家长端孩子管理页（child-manage）✅
- 新建：`miniapp/src/pages/parent/child-manage/index.tsx`
- 功能：查看已绑定孩子、生成新邀请码

### Step 5：家长端本周评比页（ranking）✅
- 替换：`miniapp/src/pages/parent/ranking/index.tsx`
- 后端：新增 `GET /api/v1/stats/weekly`、`GET /api/v1/auth/invite`
- 功能：周选择器、任务完成率、习惯打卡率、星星奖励汇总

---

## 🔄 关键架构决策记录（默认数据供参考）

> 此部分随开发进展持续更新，记录每次重要的技术选型决策

| 日期 | 决策 | 原因 |
|------|------|------|
| 初始化 | 使用 Zustand 而非 Redux | 项目规模适中，Zustand 更轻量 |
| 初始化 | 使用 React Query 管理服务端状态 | 避免手动管理 loading/error/cache |
| 初始化 | JWT 双 Token 策略 | access token 短有效期 + refresh token 提升安全性 |


