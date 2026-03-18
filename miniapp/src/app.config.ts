export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/parent/home/index',
    'pages/parent/plan/index',
    'pages/parent/ranking/index',
    'pages/parent/profile/index',
    'pages/parent/habit/create/index',
    'pages/parent/habit/edit/index',
    'pages/parent/comment/index',
    'pages/child/tasks/index',
    'pages/child/message/index',
    'pages/child/achievements/index',
    'pages/child/pomodoro/index',
    'pages/child/achievement/detail/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#6366F1',
    navigationBarTitleText: 'AI时间管理',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    list: [
      { pagePath: 'pages/child/tasks/index', text: '今日任务' },
      { pagePath: 'pages/child/achievements/index', text: '成就' },
    ],
    color: '#94A3B8',
    selectedColor: '#6366F1',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
  },
})
