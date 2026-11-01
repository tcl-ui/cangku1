import type { CurrentUser, PermissionRead, RoleRead, UserRead } from '@/types'

/** Mock 用户：在 UserRead 基础上附加内部字段 */
export interface MockUser extends UserRead {
  password: string
  role_ids: number[]
}

/** Mock 角色：在 RoleRead 基础上记录所分配的权限 id */
export interface MockRole extends RoleRead {
  permission_ids: number[]
}

let autoId = 100

/** 权限码目录（取自 RBAC 需求基线，仅取本框架涉及的子集） */
export const mockPermissions: PermissionRead[] = [
  { id: autoId++, code: 'dashboard:view', name: '工作台', description: '查看数据大盘' },
  { id: autoId++, code: 'user:list', name: '用户列表', description: '分页搜索用户' },
  { id: autoId++, code: 'user:view', name: '用户详情', description: '查看用户及其角色' },
  { id: autoId++, code: 'user:create', name: '创建用户', description: '创建用户' },
  { id: autoId++, code: 'user:update', name: '编辑用户', description: '编辑用户' },
  { id: autoId++, code: 'user:delete', name: '删除用户', description: '删除用户' },
  { id: autoId++, code: 'user:assign_roles', name: '分配角色', description: '给用户分配角色' },
  { id: autoId++, code: 'role:list', name: '角色列表', description: '查看角色列表' },
  { id: autoId++, code: 'role:view', name: '角色详情', description: '查看角色及其权限' },
  { id: autoId++, code: 'role:create', name: '创建角色', description: '创建角色' },
  { id: autoId++, code: 'role:update', name: '编辑角色', description: '编辑角色' },
  { id: autoId++, code: 'role:delete', name: '删除角色', description: '删除角色' },
  { id: autoId++, code: 'role:assign_permissions', name: '分配权限', description: '给角色分配权限' },
  { id: autoId++, code: 'permission:list', name: '权限列表', description: '查看权限列表' },
  { id: autoId++, code: 'permission:view', name: '权限详情', description: '查看权限详情' },
  { id: autoId++, code: 'permission:create', name: '创建权限', description: '创建权限' },
  { id: autoId++, code: 'permission:update', name: '编辑权限', description: '编辑权限' },
  { id: autoId++, code: 'permission:delete', name: '删除权限', description: '删除权限' },
  { id: autoId++, code: 'agent:list', name: 'Agent 列表', description: '查看 Agent 列表' },
  { id: autoId++, code: 'model:list', name: '模型列表', description: '查看模型列表' },
]

const allPermissionCodes = mockPermissions.map((p) => p.code)

/** Mock 角色 */
export const mockRoles: MockRole[] = [
  {
    id: 1,
    code: 'superadmin',
    name: '超级管理员',
    description: '拥有平台全部权限',
    permission_ids: mockPermissions.map((p) => p.id),
    permissions: allPermissionCodes,
  },
  {
    id: 2,
    code: 'ops',
    name: '运营管理员',
    description: '平台功能全部 + 系统管理只读',
    permission_ids: mockPermissions
      .filter((p) => p.code !== 'user:create' && p.code !== 'user:delete' && p.code !== 'user:update')
      .map((p) => p.id),
    permissions: mockPermissions
      .filter((p) => p.code !== 'user:create' && p.code !== 'user:delete' && p.code !== 'user:update')
      .map((p) => p.code),
  },
  {
    id: 3,
    code: 'viewer',
    name: '访客（只读）',
    description: '各模块只读权限',
    permission_ids: mockPermissions
      .filter((p) => p.code.endsWith(':list') || p.code === 'dashboard:view')
      .map((p) => p.id),
    permissions: mockPermissions
      .filter((p) => p.code.endsWith(':list') || p.code === 'dashboard:view')
      .map((p) => p.code),
  },
]

/** Mock 用户 */
export const mockUsers: MockUser[] = [
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
  {
    id: 3,
    username: 'viewer',
    email: 'viewer@example.com',
    password: 'viewer123',
    is_active: true,
    is_superuser: false,
    role_ids: [3],
    roles: ['viewer'],
    created_at: '2026-03-18T14:00:00',
  },
  {
    id: 4,
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    password: 'zhangsan123',
    is_active: true,
    is_superuser: false,
    role_ids: [3],
    roles: ['viewer'],
    created_at: '2026-04-02T08:45:00',
  },
  {
    id: 5,
    username: 'lisi',
    email: 'lisi@example.com',
    password: 'lisi123',
    is_active: false,
    is_superuser: false,
    role_ids: [3],
    roles: ['viewer'],
    created_at: '2026-05-21T16:20:00',
  },
  {
    id: 6,
    username: 'wangwu',
    email: 'wangwu@example.com',
    password: 'wangwu123',
    is_active: true,
    is_superuser: false,
    role_ids: [2],
    roles: ['ops'],
    created_at: '2026-06-30T11:10:00',
  },
]

/** 根据角色 id 列表计算权限码集合 */
export function resolvePermissions(roleIds: number[]): string[] {
  const codes = new Set<string>()
  for (const roleId of roleIds) {
    const role = mockRoles.find((r) => r.id === roleId)
    role?.permissions?.forEach((code) => codes.add(code))
  }
  return Array.from(codes).sort()
}

/** 组装 CurrentUser（登录 / /me 均返回该结构） */
export function buildCurrentUser(user: MockUser): CurrentUser {
  const roleCodes = user.role_ids
    .map((id) => mockRoles.find((r) => r.id === id)?.code)
    .filter((c): c is string => Boolean(c))

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_active: user.is_active,
    is_superuser: user.is_superuser,
    roles: roleCodes,
    permissions: user.is_superuser ? allPermissionCodes : resolvePermissions(user.role_ids),
  }
}

/** 序列化用户（剔除 password 等内部字段） */
export function toUserRead(user: MockUser): UserRead {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_active: user.is_active,
    is_superuser: user.is_superuser,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at,
    roles: user.roles,
  }
}

/** 序列化角色（剔除 permission_ids 等内部字段） */
export function toRoleRead(role: MockRole): RoleRead {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
  }
}
