import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '@/services/auth.service'

vi.mock('@/apis/auth.api', () => ({
  getCaptcha: vi.fn(),
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/apis/token', () => ({
  tokenStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

import * as authApi from '@/apis/auth.api'
import { tokenStorage } from '@/apis/token'
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

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('登录成功后写入 token 并返回当前用户', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'token-1',
      token_type: 'bearer',
      user: mockUser,
    })

    const user = await authService.login({ username: 'admin', password: 'admin123' })

    expect(authApi.login).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' })
    expect(tokenStorage.set).toHaveBeenCalledWith('token-1')
    expect(user).toEqual(mockUser)
  })

  it('登出时清除 token', () => {
    authService.logout()
    expect(tokenStorage.remove).toHaveBeenCalled()
  })

  it('isLoggedIn 依据 token 存储判定', () => {
    vi.mocked(tokenStorage.get).mockReturnValue('abc')
    expect(authService.isLoggedIn()).toBe(true)

    vi.mocked(tokenStorage.get).mockReturnValue(null)
    expect(authService.isLoggedIn()).toBe(false)
  })
})
