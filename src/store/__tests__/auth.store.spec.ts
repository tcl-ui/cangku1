import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
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

const mockUser: CurrentUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  is_active: true,
  is_superuser: true,
  roles: ['superadmin'],
  permissions: ['user:list'],
}

describe('auth.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('登录成功后写入用户并具备权限判断', async () => {
    vi.mocked(authService.login).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.login({ username: 'admin', password: 'x' })

    expect(store.user).toEqual(mockUser)
    expect(store.can('user:list')).toBe(true)
    expect(store.can('user:delete')).toBe(true) // 超管放行
  })

  it('登出后清空用户并调用服务', () => {
    const store = useAuthStore()
    store.user = mockUser

    store.logout()

    expect(authService.logout).toHaveBeenCalled()
    expect(store.user).toBeNull()
  })

  it('loadProfile 从 /me 恢复用户与权限', async () => {
    vi.mocked(authService.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.loadProfile()

    expect(store.user).toEqual(mockUser)
    expect(store.permissions).toEqual(['user:list'])
  })
})
