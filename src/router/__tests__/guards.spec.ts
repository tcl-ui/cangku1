import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { setupRouterGuards } from '@/router/guards'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/services/auth.service', () => ({
  authService: {
    getCaptcha: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    isLoggedIn: vi.fn(),
    fetchCurrentUser: vi.fn(),
  },
}))

import { authService } from '@/services/auth.service'
import type { CurrentUser } from '@/types'

function makeRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' }, meta: { public: true } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div />' }, meta: { requiresAuth: true } },
      { path: '/users', name: 'users', component: { template: '<div />' }, meta: { requiresAuth: true, permission: 'user:list' } },
      { path: '/403', name: 'forbidden', component: { template: '<div />' }, meta: {} },
    ],
  })
  setupRouterGuards(router)
  return router
}

const admin: CurrentUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  is_active: true,
  is_superuser: true,
  roles: ['superadmin'],
  permissions: [],
}

const viewer: CurrentUser = {
  id: 2,
  username: 'viewer',
  email: 'viewer@example.com',
  is_active: true,
  is_superuser: false,
  roles: ['viewer'],
  permissions: [],
}

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('未登录访问受保护页面 → 重定向登录页', async () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(false)
    const router = makeRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('已登录但内存无用户信息时从 /me 恢复', async () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(true)
    vi.mocked(authService.fetchCurrentUser).mockResolvedValue(admin)
    const router = makeRouter()

    await router.push('/dashboard')

    expect(authService.fetchCurrentUser).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(useAuthStore().user).toEqual(admin)
  })

  it('已登录但缺少页面权限 → 重定向 403', async () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(true)
    vi.mocked(authService.fetchCurrentUser).mockResolvedValue(viewer)
    const router = makeRouter()

    await router.push('/users')

    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('已登录且具备权限 → 正常放行', async () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(true)
    vi.mocked(authService.fetchCurrentUser).mockResolvedValue({
      ...viewer,
      permissions: ['user:list'],
    })
    const router = makeRouter()

    await router.push('/users')

    expect(router.currentRoute.value.name).toBe('users')
  })
})
