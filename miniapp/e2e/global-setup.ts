import { apiPost, apiGet, apiDelete, writeTestState, UserState } from './helpers'

async function getOrCreateUser(
  phone: string,
  password: string,
  nickname: string,
  role: string
): Promise<UserState> {
  const registerRes = await apiPost('/auth/register', { phone, password, nickname, role }) as {
    code: number
    data: { accessToken: string; refreshToken: string; user: { id: string; nickname: string } }
  }

  let token: string
  let refreshToken: string
  let userId: string
  let userNickname: string

  if (registerRes.code === 201) {
    token = registerRes.data.accessToken
    refreshToken = registerRes.data.refreshToken
    userId = registerRes.data.user.id
    userNickname = registerRes.data.user.nickname
  } else if (registerRes.code === 409) {
    // 账号已存在，直接登录
    const loginRes = await apiPost('/auth/login', { phone, password }) as {
      code: number
      data: { accessToken: string; refreshToken: string; user: { id: string; nickname: string } }
    }
    if (loginRes.code !== 200) {
      throw new Error(`登录失败: ${JSON.stringify(loginRes)}`)
    }
    token = loginRes.data.accessToken
    refreshToken = loginRes.data.refreshToken
    userId = loginRes.data.user.id
    userNickname = loginRes.data.user.nickname
  } else {
    throw new Error(`账号操作失败: ${JSON.stringify(registerRes)}`)
  }

  const meRes = await apiGet('/auth/me', token) as {
    data: { familyId?: string | null }
  }

  return {
    id: userId,
    phone,
    password,
    token,
    refreshToken,
    nickname: userNickname,
    role: role as 'parent' | 'child',
    familyId: meRes.data.familyId ?? null,
  }
}

export default async function globalSetup() {
  const parent = await getOrCreateUser('13988880000', 'password123', 'E2E家长', 'parent')
  let child = await getOrCreateUser('13988880001', 'password123', 'E2E孩子', 'child')

  // 如果孩子未绑定家长，则执行绑定
  if (!child.familyId) {
    const inviteRes = await apiPost(
      '/auth/invite',
      { childNickname: 'E2E孩子' },
      parent.token
    ) as { code: number; data: { inviteCode: string } }

    if (inviteRes.code === 200) {
      await apiPost('/auth/bind', { inviteCode: inviteRes.data.inviteCode }, child.token)
      // 绑定后重新登录以获取携带 familyId 的最新 token
      const loginRes = await apiPost('/auth/login', {
        phone: child.phone,
        password: child.password,
      }) as { data: { accessToken: string; refreshToken: string } }
      child.token = loginRes.data.accessToken
      child.refreshToken = loginRes.data.refreshToken
      const meRes = await apiGet('/auth/me', child.token) as {
        data: { familyId?: string | null }
      }
      child.familyId = meRes.data.familyId ?? null
    }
  }

  // 清理历史习惯数据，避免跨轮次数据残留导致测试失败
  const habitsRes = await apiGet(`/habits?childId=${child.id}`, parent.token) as {
    code: number; data: { id: string }[]
  }
  if (habitsRes.code === 200 && habitsRes.data.length > 0) {
    await Promise.all(habitsRes.data.map((h) => apiDelete(`/habits/${h.id}`, parent.token)))
    console.log(`🧹 已清理 ${habitsRes.data.length} 条历史习惯数据`)
  }

  // 清理今日任务数据，避免任务积累导致「全部完成」检测失败
  const tasksRes = await apiGet(`/tasks/today?childId=${child.id}`, parent.token) as {
    code: number; data: { id: string }[]
  }
  if (tasksRes.code === 200 && tasksRes.data.length > 0) {
    await Promise.all(tasksRes.data.map((t) => apiDelete(`/tasks/${t.id}`, parent.token)))
    console.log(`🧹 已清理 ${tasksRes.data.length} 条今日任务数据`)
  }

  writeTestState({ parent, child })
  console.log('✅ E2E 全局数据准备完成（parent + child 账号就绪，state 已写入）')
}
