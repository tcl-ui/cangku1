import { beforeEach, describe, expect, it } from 'vitest'
import {
  http,
  tokenStorage,
  listUsers,
  searchUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  assignRoles,
  listRoles,
  searchRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  listPermissions,
  searchPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  getCaptcha,
  login,
  getCurrentUser,
} from '@/apis'
import { mockRoles, mockUsers, mockPermissions, idsOfCodes } from '@/mock/data'
import { ALL_PERMISSION_CODES } from '@/constants/rbac.catalog'

/**
 * 全 API 覆盖测试：
 * 在 Mock 模式下（VITE_USE_MOCK 默认 true）通过 `http` 实例逐一走过
 * apis 层导出的全部接口函数，验证请求 → mock adapter → 拦截器解包全链路。
 * 每个用例先清理 mock 内存数据到初始状态，保证可重复执行。
 */

function resetMockData(): void {
  mockRoles.length = 0
  mockRoles.push(
    {
      id: 1,
      code: 'superadmin',
      name: '超级管理员',
      description: '系统内置',
      is_system: true,
      permission_ids: idsOfCodes(ALL_PERMISSION_CODES),
      permissions: [...ALL_PERMISSION_CODES].sort(),
    },
    {
      id: 2,
      code: 'ops',
      name: '运营管理员',
      description: '平台功能全部 + 只读系统管理',
      is_system: true,
      permission_ids: [10000],
      permissions: ['user:list'],
    },
    {
      id: 3,
      code: 'viewer',
      name: '访客',
      description: '各模块只读权限',
      is_system: true,
      permission_ids: [10001],
      permissions: ['user:list', 'role:list'],
    },
  )
  mockUsers.length = 0
  mockUsers.push(
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      is_active: true,
      is_superuser: true,
      role_ids: [1],
      roles: ['superadmin'],
      created_at: '2026-01-05T09:00:00',
    },
    {
      id: 2,
      username: 'operator',
      email: 'operator@example.com',
      password: 'operator123',
      is_active: true,
      is_superuser: false,
      role_ids: [2],
      roles: ['ops'],
      created_at: '2026-02-12T10:30:00',
    },
  )
  mockPermissions.length = 0
  mockPermissions.push(
    { id: 1, code: 'dashboard:view', name: '工作台' },
    { id: 2, code: 'user:list', name: '用户列表' },
    { id: 3, code: 'user:view', name: '用户详情' },
  )
}

describe('全 API 覆盖（Mock 模式，apis 层 → mock adapter 全链路）', () => {
  // 401 响应会清除 token（真实拦截器行为），故每个用例前恢复
  beforeEach(() => {
    resetMockData()
    tokenStorage.set('admin')
  })

  // ---------- 认证 ----------
  it('getCaptcha: GET /api/v1/captcha 返回 key + image', async () => {
    const captcha = await getCaptcha()
    expect(captcha.key).toBeTruthy()
    expect(captcha.image).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('login: POST /api/v1/auth/login 成功返回 token + user', async () => {
    const token = await login({ username: 'admin', password: 'admin123' })
    expect(token.access_token).toBe('admin')
    expect(token.user.is_superuser).toBe(true)
    expect(token.user.permissions.length).toBeGreaterThan(0)
  })

  it('login: 密码错误抛业务错误（code 401）', async () => {
    await expect(login({ username: 'admin', password: 'wrong' })).rejects.toMatchObject({
      code: 401,
    })
  })

  it('login: 账号被禁用返回 code 403 业务错误', async () => {
    mockUsers[0].is_active = false
    await expect(login({ username: 'admin', password: 'admin123' })).rejects.toMatchObject({
      code: 403,
    })
  })

  it('getCurrentUser: GET /api/v1/users/me 带 token 返回当前用户', async () => {
    const me = await getCurrentUser()
    expect(me.username).toBe('admin')
    expect(me.roles).toContain('superadmin')
  })

  // ---------- 用户 ----------
  it('listUsers: GET /api/v1/users 返回全量用户（剔除 password）', async () => {
    const users = await listUsers()
    expect(users.length).toBe(2)
    expect((users[0] as unknown as Record<string, unknown>).password).toBeUndefined()
  })

  it('searchUsers: GET /api/v1/users/search 分页 + 关键词', async () => {
    const page1 = await searchUsers({ page: 1, page_size: 10 })
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(2)

    const filtered = await searchUsers({ keyword: 'operator' })
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0].username).toBe('operator')
  })

  it('getUser: GET /api/v1/users/{id} 命中与 404', async () => {
    const user = await getUser(1)
    expect(user.username).toBe('admin')
    await expect(getUser(999)).rejects.toMatchObject({ code: 404 })
  })

  it('createUser: POST /api/v1/users 创建成功并返回 UserRead', async () => {
    const created = await createUser({
      username: 'newbie',
      email: 'newbie@example.com',
      password: 'x',
    })
    expect(created.username).toBe('newbie')
    expect(created.id).toBeGreaterThan(2)
  })

  it('updateUser: PUT /api/v1/users/{id} 更新邮箱', async () => {
    const updated = await updateUser(2, { email: 'new-op@example.com' })
    expect(updated.email).toBe('new-op@example.com')
  })

  it('assignRoles: PUT /api/v1/users/{id}/roles 替换角色并同步 roles', async () => {
    const updated = await assignRoles(2, { role_ids: [3] })
    expect(updated.roles).toEqual(['viewer'])
  })

  it('deleteUser: DELETE /api/v1/users/{id} 删除成功', async () => {
    await expect(deleteUser(2)).resolves.toBeNull()
    const users = await listUsers()
    expect(users.find((u) => u.id === 2)).toBeUndefined()
  })

  // ---------- 角色 ----------
  it('listRoles: GET /api/v1/roles 返回全量角色（剔除 permission_ids）', async () => {
    const roles = await listRoles()
    expect(roles.length).toBe(3)
    expect((roles[0] as unknown as Record<string, unknown>).permission_ids).toBeUndefined()
  })

  it('searchRoles: GET /api/v1/roles/search 分页 + 关键词', async () => {
    const filtered = await searchRoles({ keyword: '运营' })
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0].code).toBe('ops')
  })

  it('getRole: GET /api/v1/roles/{id} 命中与 404', async () => {
    const role = await getRole(2)
    expect(role.code).toBe('ops')
    await expect(getRole(999)).rejects.toMatchObject({ code: 404 })
  })

  it('createRole: POST /api/v1/roles 创建成功', async () => {
    const created = await createRole({ code: 'custom', name: '自定义角色' })
    expect(created.code).toBe('custom')
    expect(created.permissions).toEqual([])
  })

  it('updateRole: PUT /api/v1/roles/{id} 更新名称', async () => {
    const updated = await updateRole(3, { name: '访客（改名）' })
    expect(updated.name).toBe('访客（改名）')
  })

  it('assignPermissions: PUT /api/v1/roles/{id}/permissions 同步权限码', async () => {
    const updated = await assignPermissions(2, { permission_ids: [1, 3] })
    expect(updated.permissions).toEqual(['dashboard:view', 'user:view'])
  })

  it('deleteRole: DELETE /api/v1/roles/{id} 删除成功', async () => {
    await expect(deleteRole(3)).resolves.toBeNull()
    const roles = await listRoles()
    expect(roles.find((r) => r.id === 3)).toBeUndefined()
  })

  // ---------- 权限 ----------
  it('listPermissions: GET /api/v1/permissions 返回全量权限', async () => {
    const perms = await listPermissions()
    expect(perms.length).toBe(3)
  })

  it('searchPermissions: GET /api/v1/permissions/search 分页 + 关键词', async () => {
    const filtered = await searchPermissions({ keyword: 'user:' })
    expect(filtered.items.map((p) => p.code)).toEqual(['user:list', 'user:view'])
  })

  it('getPermission: GET /api/v1/permissions/{id} 命中与 404', async () => {
    const perm = await getPermission(1)
    expect(perm.code).toBe('dashboard:view')
    await expect(getPermission(999)).rejects.toMatchObject({ code: 404 })
  })

  it('createPermission: POST /api/v1/permissions 创建成功', async () => {
    const created = await createPermission({
      code: 'audit:list',
      name: '审计日志列表',
    })
    expect(created.code).toBe('audit:list')
    expect(created.id).toBeGreaterThan(1000)
  })

  it('createPermission: 非法编码（已内置）返回 400', async () => {
    await expect(createPermission({ code: 'user:list', name: '重复' })).rejects.toMatchObject({
      code: 400,
    })
  })

  it('updatePermission: PUT /api/v1/permissions/{id} 更新名称', async () => {
    const updated = await updatePermission(2, { name: '用户列表（新名）' })
    expect(updated.name).toBe('用户列表（新名）')
  })

  it('deletePermission: DELETE /api/v1/permissions/{id} 删除成功', async () => {
    await expect(deletePermission(3)).resolves.toBeNull()
    const perms = await listPermissions()
    expect(perms.find((p) => p.id === 3)).toBeUndefined()
  })

  // ---------- 未知接口兜底 ----------
  it('未匹配的接口返回 404 业务码', async () => {
    await expect(http.get('/api/v1/not-exist')).rejects.toMatchObject({ code: 404 })
  })

  it('http 实例导出可用（USE_MOCK 开关与 baseURL）', async () => {
    expect(http.defaults.timeout).toBe(15000)
  })
})
