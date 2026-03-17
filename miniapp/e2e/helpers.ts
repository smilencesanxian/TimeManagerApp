import * as fs from 'fs'
import * as path from 'path'
import { Page } from '@playwright/test'

const API = 'http://localhost:3000/api/v1'
const STATE_FILE = path.join(__dirname, '.test-state.json')

export interface UserState {
  id: string
  phone: string
  password: string
  token: string
  refreshToken: string
  nickname: string
  role: 'parent' | 'child'
  familyId?: string | null
}

export interface TestState {
  parent: UserState
  child: UserState
}

export function readTestState(): TestState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
}

export function writeTestState(state: TestState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

export async function apiPost(
  urlPath: string,
  body: object,
  token?: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Record<string, unknown>>
}

export async function apiGet(
  urlPath: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json() as Promise<Record<string, unknown>>
}

export interface FreshLoginResult {
  token: string
  refreshToken: string
  user: { id: string; nickname: string; role: string }
}

export async function loginViaApi(
  phone: string,
  password: string
): Promise<FreshLoginResult> {
  const res = await apiPost('/auth/login', { phone, password }) as {
    data: { accessToken: string; refreshToken: string; user: { id: string; nickname: string; role: string } }
  }
  return {
    token: res.data.accessToken,
    refreshToken: res.data.refreshToken,
    user: res.data.user,
  }
}

export interface CreatedTask {
  id: string
  title: string
  status: string
}

export async function createFreshTask(
  parentToken: string,
  childId: string
): Promise<CreatedTask> {
  const today = new Date().toISOString().slice(0, 10)
  const res = await apiPost(
    '/tasks',
    {
      childId,
      date: today,
      subject: '数学',
      title: `E2E测试任务_${Date.now()}`,
      duration: 25,
      priority: 2,
    },
    parentToken
  ) as { data: CreatedTask }
  return res.data
}

export async function apiDelete(
  urlPath: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json() as Promise<Record<string, unknown>>
}

export async function apiPut(
  urlPath: string,
  body: object,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Record<string, unknown>>
}

export interface CreatedHabit {
  id: string
  name: string
  icon: string
  frequency: 'daily' | 'weekly'
  rewardStars: number
}

export async function createFreshHabit(
  parentToken: string,
  childId: string,
  overrides: Partial<{
    name: string
    icon: string
    frequency: 'daily' | 'weekly'
    rewardStars: number
  }> = {}
): Promise<CreatedHabit> {
  const res = await apiPost(
    '/habits',
    {
      childId,
      name: overrides.name ?? `E2E习惯_${Date.now()}`,
      icon: overrides.icon ?? '📚',
      frequency: overrides.frequency ?? 'daily',
      rewardStars: overrides.rewardStars ?? 1,
    },
    parentToken
  ) as { data: CreatedHabit }
  return res.data
}

export async function checkInHabitViaApi(
  childToken: string,
  habitId: string
): Promise<Record<string, unknown>> {
  return apiPost(`/habits/${habitId}/checkin`, {}, childToken)
}

export async function getAchievementSummary(
  childToken: string
): Promise<{ stars: number; moons: number; suns: number; level: number; levelTitle: string }> {
  const res = await apiGet('/achievements/summary', childToken) as {
    data: { stars: number; moons: number; suns: number; level: number; levelTitle: string }
  }
  return res.data
}

/**
 * 通过 addInitScript 在页面加载前注入 localStorage，
 * 等效于用户已完成登录（跳过 UI 登录流程）。
 *
 * 必须在 page.goto() 之前调用。
 */
export async function injectAuth(
  page: Page,
  user: { id: string; nickname: string; role: string },
  token: string,
  refreshToken: string
): Promise<void> {
  // Taro H5 storage wraps values as { data: value } — must match this format
  await page.addInitScript(
    ({ t, rt, u }) => {
      const wrap = (v: string) => JSON.stringify({ data: v })
      localStorage.setItem('access_token', wrap(t))
      localStorage.setItem('refresh_token', wrap(rt))
      localStorage.setItem('user_info', wrap(JSON.stringify(u)))
    },
    {
      t: token,
      rt: refreshToken,
      u: { id: user.id, nickname: user.nickname, role: user.role, avatarUrl: null },
    }
  )
}
