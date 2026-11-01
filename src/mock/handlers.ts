import type { InternalAxiosRequestConfig } from 'axios'
import type {
  ApiResponse,
  CaptchaResult,
  PageParams,
  PageResult,
  PermissionRead,
  RoleRead,
  UserRead,
} from '@/types'
import {
  assertNewPermissionCode,
  buildCurrentUser,
  mockPermissions,
  mockRoles,
  mockUsers,
  nextPermissionId,
  toRoleRead,
  toUserRead,
  type MockRole,
  type MockUser,
} from './data'

function ok<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'success', data }
}

function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null }
}

/** 解析请求体（axios 对 json 对象已做序列化） */
function parseBody(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return (data as Record<string, unknown>) ?? {}
}

/** 从请求头解析 Bearer token */
function getToken(config: InternalAxiosRequestConfig): string | null {
  const raw = config.headers.get('Authorization')
  if (!raw || typeof raw !== 'string') return null
  return raw.replace(/^Bearer\s+/i, '')
}

/** 简单分页 + 关键词搜索 */
function paginate<T>(
  list: T[],
  params: PageParams,
  searchFields: (keyof T)[],
): PageResult<T> {
  const keyword = params.keyword?.trim()
  const filtered = keyword
    ? list.filter((item) =>
        searchFields.some((f) =>
          String(item[f] ?? '').toLowerCase().includes(keyword.toLowerCase()),
        ),
      )
    : list

  const page = params.page ?? 1
  const pageSize = params.page_size ?? 10
  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
  }
}

/** 内存验证码：key -> code */
const captchaStore = new Map<string, string>()

function makeCaptcha(): CaptchaResult {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase()
  const key = `captcha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  captchaStore.set(key, code)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">` +
    `<rect width="120" height="40" fill="#f0f4f3"/>` +
    `<text x="60" y="27" font-size="22" text-anchor="middle" fill="#2f855a">${code}</text>` +
    `</svg>`

  return { key, image: `data:image/svg+xml;base64,${btoa(svg)}` }
}

/** 查找 mock 用户（token 为用户名，简化演示） */
function findUserByToken(config: InternalAxiosRequestConfig): MockUser | null {
  const token = getToken(config)
  if (!token) return null
  return mockUsers.find((u) => u.username === token) ?? null
}

export function handleMockRequest(config: InternalAxiosRequestConfig): unknown {
  const method = (config.method ?? 'get').toLowerCase()
  const path = (config.url ?? '').replace(/^\/api\/v1/, '')
  const params = (config.params ?? {}) as PageParams
  const body = parseBody(config.data)

  // ---------- 验证码 / 认证 ----------
  if (method === 'get' && path === '/captcha') {
    return ok(makeCaptcha())
  }

  if (method === 'post' && path === '/auth/login') {
    const username = String(body.username ?? '')
    const password = String(body.password ?? '')

    const captchaKey = body.captcha_key ? String(body.captcha_key) : undefined
    if (captchaKey) {
      const expected = captchaStore.get(captchaKey)
      if (!expected || expected !== String(body.captcha_code ?? '')) {
        return fail(400, '验证码错误或已过期')
      }
    }

    const user = mockUsers.find((u) => u.username === username && u.password === password)
    if (!user) {
      return fail(401, '用户名或密码错误')
    }
    if (!user.is_active) {
      return fail(403, '账号已被禁用')
    }

    return ok({
      access_token: user.username,
      token_type: 'bearer',
      user: buildCurrentUser(user),
    })
  }

  if (method === 'get' && path === '/users/me') {
    const user = findUserByToken(config)
    if (!user) return fail(401, '未登录或 token 失效')
    return ok(buildCurrentUser(user))
  }

  // ---------- 用户 ----------
  if (method === 'get' && path === '/users/search') {
    return ok(paginate<UserRead>(mockUsers, params, ['username', 'email']))
  }
  if (method === 'get' && path === '/users') {
    return ok(mockUsers.map(toUserRead))
  }
  if (method === 'post' && path === '/users') {
    const user: MockUser = {
      id: Math.max(...mockUsers.map((u) => u.id), 0) + 1,
      username: String(body.username ?? ''),
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      is_active: body.is_active !== false,
      is_superuser: body.is_superuser === true,
      role_ids: [],
      roles: [],
      created_at: new Date().toISOString(),
    }
    mockUsers.push(user)
    return ok(toUserRead(user))
  }

  const userMatch = path.match(/^\/users\/(\d+)$/)
  if (userMatch) {
    const id = Number(userMatch[1])
    const idx = mockUsers.findIndex((u) => u.id === id)

    if (method === 'get') {
      if (idx < 0) return fail(404, '用户不存在')
      return ok(toUserRead(mockUsers[idx]))
    }
    if (method === 'put') {
      if (idx < 0) return fail(404, '用户不存在')
      const user = mockUsers[idx]
      if (body.email) user.email = String(body.email)
      if (body.password) user.password = String(body.password)
      if (typeof body.is_active === 'boolean') user.is_active = body.is_active
      if (typeof body.is_superuser === 'boolean') user.is_superuser = body.is_superuser
      return ok(toUserRead(user))
    }
    if (method === 'delete') {
      if (idx < 0) return fail(404, '用户不存在')
      mockUsers.splice(idx, 1)
      return ok(null)
    }
  }

  const userRolesMatch = path.match(/^\/users\/(\d+)\/roles$/)
  if (userRolesMatch && method === 'put') {
    const id = Number(userRolesMatch[1])
    const user = mockUsers.find((u) => u.id === id)
    if (!user) return fail(404, '用户不存在')
    const roleIds = (body.role_ids ?? []) as number[]
    user.role_ids = roleIds
    user.roles = roleIds
      .map((rid) => mockRoles.find((r) => r.id === rid)?.code)
      .filter((c): c is string => Boolean(c))
    return ok(toUserRead(user))
  }

  // ---------- 角色 ----------
  if (method === 'get' && path === '/roles/search') {
    return ok(paginate<RoleRead>(mockRoles, params, ['code', 'name']))
  }
  if (method === 'get' && path === '/roles') {
    return ok(mockRoles.map(toRoleRead))
  }
  if (method === 'post' && path === '/roles') {
    const role: MockRole = {
      id: Math.max(...mockRoles.map((r) => r.id), 0) + 1,
      code: String(body.code ?? ''),
      name: String(body.name ?? ''),
      description: body.description ? String(body.description) : undefined,
      permission_ids: [],
      permissions: [],
    }
    mockRoles.push(role)
    return ok(toRoleRead(role))
  }

  const roleMatch = path.match(/^\/roles\/(\d+)$/)
  if (roleMatch) {
    const id = Number(roleMatch[1])
    const idx = mockRoles.findIndex((r) => r.id === id)

    if (method === 'get') {
      if (idx < 0) return fail(404, '角色不存在')
      return ok(toRoleRead(mockRoles[idx]))
    }
    if (method === 'put') {
      if (idx < 0) return fail(404, '角色不存在')
      const role = mockRoles[idx]
      if (body.name) role.name = String(body.name)
      if (body.description) role.description = String(body.description)
      return ok(toRoleRead(role))
    }
    if (method === 'delete') {
      if (idx < 0) return fail(404, '角色不存在')
      mockRoles.splice(idx, 1)
      return ok(null)
    }
  }

  const rolePermsMatch = path.match(/^\/roles\/(\d+)\/permissions$/)
  if (rolePermsMatch && method === 'put') {
    const id = Number(rolePermsMatch[1])
    const role = mockRoles.find((r) => r.id === id)
    if (!role) return fail(404, '角色不存在')
    const permissionIds = (body.permission_ids ?? []) as number[]
    role.permission_ids = permissionIds
    role.permissions = permissionIds
      .map((pid) => mockPermissions.find((p) => p.id === pid)?.code)
      .filter((c): c is string => Boolean(c))
    return ok(toRoleRead(role))
  }

  // ---------- 权限 ----------
  if (method === 'get' && path === '/permissions/search') {
    return ok(paginate<PermissionRead>(mockPermissions, params, ['code', 'name']))
  }
  if (method === 'get' && path === '/permissions') {
    return ok(mockPermissions)
  }
  if (method === 'post' && path === '/permissions') {
    const code = String(body.code ?? '')
    const name = String(body.name ?? '')
    try {
      assertNewPermissionCode(code)
    } catch (e) {
      return fail(400, e instanceof Error ? e.message : '权限编码不合法')
    }
    if (!name) return fail(400, '权限名称不能为空')
    const permission: PermissionRead = {
      id: nextPermissionId(),
      code,
      name,
      description: body.description ? String(body.description) : undefined,
    }
    mockPermissions.push(permission)
    return ok(permission)
  }

  const permissionMatch = path.match(/^\/permissions\/(\d+)$/)
  if (permissionMatch) {
    const id = Number(permissionMatch[1])
    const idx = mockPermissions.findIndex((p) => p.id === id)

    if (method === 'get') {
      if (idx < 0) return fail(404, '权限不存在')
      return ok(mockPermissions[idx])
    }
    if (method === 'put') {
      if (idx < 0) return fail(404, '权限不存在')
      const permission = mockPermissions[idx]
      if (body.name) permission.name = String(body.name)
      if (body.description) permission.description = String(body.description)
      return ok(permission)
    }
    if (method === 'delete') {
      if (idx < 0) return fail(404, '权限不存在')
      mockPermissions.splice(idx, 1)
      return ok(null)
    }
  }

  return fail(404, `未匹配到 Mock 接口：${method.toUpperCase()} ${path}`)
}
