import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userService } from '@/services/user.service'

vi.mock('@/apis/user.api', () => ({
  searchUsers: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  assignRoles: vi.fn(),
}))

import * as userApi from '@/apis/user.api'
import type { UserRead } from '@/types'

const user: UserRead = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  is_active: true,
  is_superuser: true,
  roles: ['superadmin'],
}

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getUsers 归一化分页参数（缺省 page/page_size）', async () => {
    vi.mocked(userApi.searchUsers).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    await userService.getUsers()

    expect(userApi.searchUsers).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      keyword: undefined,
    })
  })

  it('createUser 校验邮箱格式（非法邮箱直接抛错）', async () => {
    await expect(
      userService.createUser({ username: 'u', email: 'not-an-email', password: 'x' }),
    ).rejects.toThrow('邮箱格式不正确')
    expect(userApi.createUser).not.toHaveBeenCalled()
  })

  it('createUser 合法入参透传到 API', async () => {
    vi.mocked(userApi.createUser).mockResolvedValue(user)

    await userService.createUser({
      username: 'admin',
      email: 'admin@example.com',
      password: 'x',
    })

    expect(userApi.createUser).toHaveBeenCalledWith({
      username: 'admin',
      email: 'admin@example.com',
      password: 'x',
    })
  })

  it('assignRoles 将 roleIds 封装为 role_ids', async () => {
    vi.mocked(userApi.assignRoles).mockResolvedValue(user)

    await userService.assignRoles(1, [1, 2])

    expect(userApi.assignRoles).toHaveBeenCalledWith(1, { role_ids: [1, 2] })
  })
})
