import type { CurrentUser, PermissionRead, RoleRead, UserRead } from '@/types'
import {
  ALL_PERMISSION_CODES,
  CODE_TO_ID,
  PERMISSION_GROUPS,
  READ_ONLY_PERMISSION_CODES,
  codesOfIds,
  idsOfCodes,
  permissionNameOf,
} from '@/constants/rbac.catalog'

/** Mock 用户：在 UserRead 基础上附加内部字段 */
export interface MockUser extends UserRead {
  password: string
}

/** Mock 角色：在 RoleRead 基础上记录所分配的权限 id */
export interface MockRole extends RoleRead {
  permission_ids: number[]
  is_system?: boolean
}

let autoId = 1000

/**
 * 权限码目录（67 项，取自 RBAC 需求基线 4.2 / 原型 rbac.js）。
 * id 采用目录顺序（1 起），与 CODE_TO_ID 保持一致。
 */
export const mockPermissions: PermissionRead[] = PERMISSION_GROUPS.flatMap((group) =>
  group.perms.map((p): PermissionRead => ({
    id: CODE_TO_ID.get(p.code) as number,
    code: p.code,
    name: p.name,
    description: p.desc,
  })),
)

/** 内置角色：超管（全量）、运营、访客（只读）、知识库编辑 */
export const mockRoles: MockRole[] = [
  {
    id: 1,
    code: 'superadmin',
    name: '超级管理员',
    description: '系统内置，拥有全部权限（is_superuser 绕过）',
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
    permission_ids: idsOfCodes(
      ALL_PERMISSION_CODES.filter(
        (c) => !/^(user|role|permission):(create|update|delete|assign)/.test(c),
      ),
    ),
    permissions: ALL_PERMISSION_CODES.filter(
      (c) => !/^(user|role|permission):(create|update|delete|assign)/.test(c),
    ).sort(),
  },
  {
    id: 3,
    code: 'viewer',
    name: '访客',
    description: '各模块只读权限',
    is_system: true,
    permission_ids: idsOfCodes(READ_ONLY_PERMISSION_CODES),
    permissions: [...READ_ONLY_PERMISSION_CODES].sort(),
  },
  {
    id: 4,
    code: 'kb_editor',
    name: '知识库编辑',
    description: '仅知识库模块读写',
    permission_ids: idsOfCodes(
      ALL_PERMISSION_CODES.filter((c) => c.startsWith('knowledge:')),
    ),
    permissions: ALL_PERMISSION_CODES.filter((c) => c.startsWith('knowledge:')).sort(),
  },
]

/** Mock 用户（token 简化为 username，密码 = username + 123） */
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

/** 根据角色 id 列表计算权限码集合（去重、排序） */
export function resolvePermissions(roleIds: number[]): string[] {
  const codes = new Set<string>()
  for (const roleId of roleIds) {
    const role = mockRoles.find((r) => r.id === roleId)
    role?.permissions?.forEach((code) => codes.add(code))
  }
  return Array.from(codes).sort()
}

/** 组装 CurrentUser（登录 / /me 均返回该结构，与后端 CurrentUserRead 同构） */
export function buildCurrentUser(user: MockUser): CurrentUser {
  const roleIds = user.role_ids ?? []
  const roleCodes = roleIds
    .map((id) => mockRoles.find((r) => r.id === id)?.code)
    .filter((c): c is string => Boolean(c))

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_active: user.is_active,
    is_superuser: user.is_superuser,
    roles: roleCodes,
    permissions: user.is_superuser
      ? [...ALL_PERMISSION_CODES].sort()
      : resolvePermissions(roleIds),
  }
}

/** 序列化用户（保留 role_ids 供前端分配角色回填，剔除 password） */
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
    role_ids: user.role_ids,
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

/** 新建权限时分配的 id（避开目录顺序段，避免与内置码冲突） */
export function nextPermissionId(): number {
  autoId += 1
  return autoId
}

/** 新建权限码校验：格式 `{resource}:{action}` 且未被目录占用 */
export function assertNewPermissionCode(code: string): void {
  if (!/^[a-z_]+:[a-z_]+$/.test(code)) {
    throw new Error('权限编码格式须为 模块:操作（小写）')
  }
  if (ALL_PERMISSION_CODES.includes(code)) {
    throw new Error(`权限编码 ${code} 已内置`)
  }
}

export { codesOfIds, idsOfCodes }
export function nameOf(code: string): string {
  return permissionNameOf(code)
}
