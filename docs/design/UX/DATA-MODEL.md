# TimeManagerApp - 数据模型规范
> **Version**: 2.0  
> **Date**: 2026-03-16  
> **Format**: TypeScript Interface

---

## 👤 用户相关 (User)

### User (用户基础)
```typescript
interface User {
  id: string;                    // 用户唯一 ID (UUID)
  phone: string;                 // 手机号 (登录账号)
  nickname: string;              // 昵称
  avatar?: string;               // 头像 URL
  role: 'parent' | 'child';      // 角色
  createdAt: Date;               // 注册时间
  updatedAt: Date;               // 更新时间
}
```

### Parent (家长)
```typescript
interface Parent extends User {
  role: 'parent';
  children: Child[];             // 绑定的孩子列表
  settings: ParentSettings;      // 家长设置
}

interface ParentSettings {
  notificationEnabled: boolean;  // 开启通知
  dailyReportTime: string;       // 日报推送时间 (HH:mm, 默认 "20:00")
  weeklyReportDay: number;       // 周报推送日 (1-7, 默认 7=周日)
  language: 'zh-CN' | 'zh-TW' | 'en';
  theme: 'light' | 'dark' | 'system';
}
```

### Child (孩子)
```typescript
interface Child extends User {
  role: 'child';
  parentId: string;              // 绑定家长 ID
  age: number;                   // 年龄 (用于适龄推荐)
  grade?: string;                // 年级 (可选)
  achievements: Achievement;     // 成就数据
  settings: ChildSettings;       // 孩子端设置
}

interface ChildSettings {
  restModeEnabled: boolean;      // 启用休息模式
  focusDuration: number;         // 默认专注时长 (分钟, 默认 25)
  breakDuration: number;         // 默认休息时长 (分钟, 默认 5)
  soundEnabled: boolean;         // 提示音开关
}
```

---

## 📝 任务相关 (Task)

### Task (任务)
```typescript
interface Task {
  id: string;                    // 任务 ID
  childId: string;               // 所属孩子 ID
  title: string;                 // 任务名称 (必填)
  description?: string;          // 任务描述 (可选)
  
  // 学科分类
  subject: SubjectType;
  
  // 时间安排
  scheduledDate: string;         // 计划日期 (YYYY-MM-DD)
  startTime: string;             // 开始时间 (HH:mm)
  endTime: string;               // 结束时间 (HH:mm)
  duration: number;              // 预计时长 (分钟)
  
  // 状态
  status: TaskStatus;
  
  // 番茄钟
  pomodoro?: PomodoroSession;    // 番茄钟记录
  
  // 奖励
  rewardStars: number;           // 完成奖励星星数 (默认 1)
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'parent' | 'template' | 'system';  // 创建来源
  templateId?: string;           // 如从模板创建
}

type SubjectType = 'math' | 'chinese' | 'english' | 'other';

type TaskStatus = 'todo' | 'doing' | 'done' | 'overdue';
```

### PomodoroSession (番茄钟记录)
```typescript
interface PomodoroSession {
  taskId: string;                // 关联任务
  plannedDuration: number;       // 计划专注时长 (分钟)
  actualDuration: number;        // 实际专注时长 (分钟)
  startedAt: Date;               // 开始时间
  endedAt?: Date;                // 结束时间
  status: 'running' | 'paused' | 'completed' | 'abandoned';
  pauseCount: number;            // 暂停次数
  totalPauseTime: number;        // 总暂停时长 (秒)
}
```

---

## 🌱 习惯相关 (Habit)

### Habit (习惯)
```typescript
interface Habit {
  id: string;                    // 习惯 ID
  childId: string;               // 所属孩子 ID
  title: string;                 // 习惯名称
  icon: string;                  // 图标 emoji (如 🌱, 📚, 🏃)
  color: string;                 // 主题色 (Hex)
  
  // 频率设置
  frequency: HabitFrequency;
  
  // 提醒
  reminderTime?: string;         // 提醒时间 (HH:mm, 可选)
  
  // 当前状态
  currentStreak: number;         // 当前连续打卡天数
  longestStreak: number;         // 最长连续打卡天数
  totalCheckIns: number;         // 总打卡次数
  
  // 今日状态
  todayStatus: 'checked' | 'unchecked' | 'skipped';
  todayCheckedAt?: Date;         // 今日打卡时间
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

interface HabitFrequency {
  type: 'daily' | 'weekly' | 'custom';
  days?: number[];               // 每周哪几天 (0-6, 0=周日), custom 时必填
}
```

### HabitCheckIn (习惯打卡记录)
```typescript
interface HabitCheckIn {
  id: string;
  habitId: string;
  childId: string;
  date: string;                  // 打卡日期 (YYYY-MM-DD)
  status: 'checked' | 'skipped' | 'missed';
  checkedAt?: Date;              // 打卡时间
  note?: string;                 // 备注 (可选)
}
```

---

## 📅 计划模板 (Template)

### PlanTemplate (计划模板)
```typescript
interface PlanTemplate {
  id: string;                    // 模板 ID
  name: string;                  // 模板名称
  description: string;           // 模板描述
  icon: string;                  // 图标 emoji
  category: TemplateCategory;
  
  // 模板内容
  tasks: TemplateTask[];         // 预设任务列表
  habits: string[];              // 关联的习惯 ID 列表
  
  // 适用年龄
  minAge?: number;               // 最小适用年龄
  maxAge?: number;               // 最大适用年龄
  
  // 元数据
  isSystem: boolean;             // 是否系统预设
  createdBy?: string;            // 创建者 (用户模板时)
  usageCount: number;            // 使用次数
}

type TemplateCategory = 'daily-study' | 'exam-review' | 'vacation' | 'weekend' | 'custom';

interface TemplateTask {
  title: string;
  subject: SubjectType;
  duration: number;              // 建议时长 (分钟)
  defaultStartTime: string;      // 默认开始时间 (HH:mm)
  description?: string;
}
```

---

## 🏆 成就系统 (Achievement)

### Achievement (成就数据)
```typescript
interface Achievement {
  childId: string;               // 孩子 ID
  
  // 货币系统
  stars: number;                 // 当前星星数
  moons: number;                 // 当前月亮数
  suns: number;                  // 当前太阳数
  
  // 历史总计
  totalStarsEarned: number;      // 累计获得星星
  totalTasksCompleted: number;   // 完成任务总数
  totalFocusMinutes: number;     // 累计专注分钟数
  
  // 等级
  level: number;                 // 当前等级
  currentLevelStars: number;     // 当前等级进度星星
  starsForNextLevel: number;     // 升级所需星星
  
  // 历史记录
  history: AchievementHistory[];
}
```

### AchievementHistory (成就历史)
```typescript
interface AchievementHistory {
  id: string;
  childId: string;
  date: string;                  // YYYY-MM-DD
  
  type: 'task_complete' | 'habit_checkin' | 'focus_bonus' | 'weekly_bonus' | 'level_up';
  
  // 获得的奖励
  starsEarned: number;
  moonsEarned: number;
  sunsEarned: number;
  
  // 详情
  description: string;           // 描述 (如 "完成数学作业")
  relatedTaskId?: string;        // 关联任务
  relatedHabitId?: string;       // 关联习惯
  
  createdAt: Date;
}
```

### 奖励规则
```typescript
const REWARD_RULES = {
  // 任务完成基础奖励
  taskComplete: {
    baseStars: 1,                // 1 个任务 = 1 星
  },
  
  // 连续习惯打卡奖励
  habitStreak: {
    weeklyBonus: 5,              // 连续7天 +5 星
  },
  
  // 专注时长奖励
  focusBonus: {
    minMinutes: 30,              // 专注超过30分钟
    bonusStars: 2,               // 额外 +2 星
  },
  
  // 兑换比例
  conversion: {
    starsToMoon: 10,             // 10 星 = 1 月
    moonsToSun: 10,              // 10 月 = 1 日
  },
  
  // 等级计算
  levelUp: {
    baseStars: 10,               // 每级需要星星数 (可递增)
    increment: 5,                // 每级递增 5 星
  }
};
```

---

## 📊 排行榜 (Ranking)

### WeeklyRanking (周排行榜)
```typescript
interface WeeklyRanking {
  weekId: string;                // 周 ID (YYYY-Wxx 格式)
  childId: string;
  
  // 统计
  startDate: string;             // 周开始日期 (周一)
  endDate: string;               // 周结束日期 (周日)
  
  // 任务统计
  tasksTotal: number;            // 总任务数
  tasksCompleted: number;        // 已完成数
  tasksCompletionRate: number;   // 完成率 (0-1)
  
  // 习惯统计
  habitsTotalDays: number;       // 总打卡天数
  habitsCheckedDays: number;     // 已打卡天数
  habitsCheckInRate: number;     // 打卡率 (0-1)
  
  // 专注统计
  totalFocusMinutes: number;     // 总专注时长
  focusDaysCount: number;        // 有专注记录的天数
  
  // 奖励
  starsEarned: number;           // 本周获得星星
  weeklyBonus: number;           // 周全勤奖励
  
  // 排名 (同年龄段)
  rank?: number;                 // 排名
  totalParticipants?: number;    // 总参与人数
}
```

---

## 🔔 通知相关 (Notification)

### Notification (通知)
```typescript
interface Notification {
  id: string;
  userId: string;                // 接收者 ID
  type: NotificationType;
  
  title: string;                 // 通知标题
  content: string;               // 通知内容
  
  // 关联数据
  relatedId?: string;            // 关联任务/习惯 ID
  relatedType?: 'task' | 'habit' | 'ranking';
  
  // 状态
  isRead: boolean;
  readAt?: Date;
  
  // 时间
  createdAt: Date;
  expireAt?: Date;               // 过期时间
}

type NotificationType = 
  | 'task_reminder'      // 任务提醒
  | 'task_overdue'       // 任务逾期
  | 'habit_reminder'     // 习惯提醒
  | 'daily_report'       // 日报
  | 'weekly_report'      // 周报
  | 'achievement'        // 成就达成
  | 'ranking_update'     // 排名更新
  | 'system';            // 系统通知
```

---

## 📱 API 响应格式

### 标准响应
```typescript
interface ApiResponse<T> {
  code: number;                  // 0 = 成功
  message: string;               // 提示信息
  data: T;                       // 响应数据
  timestamp: number;             // 时间戳
}

// 分页响应
interface PaginatedResponse<T> {
  list: T[];
  pagination: {
    page: number;                // 当前页
    pageSize: number;            // 每页条数
    total: number;               // 总条数
    totalPages: number;          // 总页数
  };
}
```

---

## 🗄️ 数据库集合/表名

| 实体 | Collection/Table | 主要索引 |
|------|------------------|----------|
| 用户 | `users` | phone, role |
| 任务 | `tasks` | childId, scheduledDate, status |
| 习惯 | `habits` | childId, frequency |
| 习惯打卡 | `habit_checkins` | habitId, date |
| 番茄钟 | `pomodoro_sessions` | taskId, startedAt |
| 模板 | `templates` | category, isSystem |
| 成就 | `achievements` | childId (唯一) |
| 成就历史 | `achievement_history` | childId, date |
| 排行榜 | `weekly_rankings` | weekId, childId |
| 通知 | `notifications` | userId, isRead, createdAt |

---

**文档维护**: UI Design Agent  
**最后更新**: 2026-03-16
