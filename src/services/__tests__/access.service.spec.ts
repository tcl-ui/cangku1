import { describe, expect, it } from 'vitest'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
} from '@/services/access.service'
import type { CurrentUser } from '@/types'

const superuser: CurrentUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  is_active: true,
  is_superuser: true,
  roles: ['superadmin'],
  permissions: [],
}

const normal: CurrentUser = {
  id: 2,
  username: 'ops',
  email: 'ops@example.com',
  is_active: true,
  is_superuser: false,
  roles: ['ops'],
  permissions: ['user:list', 'role:list'],
}

describe('access.service', () => {
  it('未登录用户不具备任何权限', () => {
    expect(hasPermission(null, 'user:list')).toBe(false)
    expect(hasRole(null, 'ops')).toBe(false)
  })

  it('超级管理员默认拥有全部权限', () => {
    expect(hasPermission(superuser, 'anything:xyz')).toBe(true)
  })

  it('普通用户按权限码精确匹配', () => {
    expect(hasPermission(normal, 'user:list')).toBe(true)
    expect(hasPermission(normal, 'user:delete')).toBe(false)
  })

  it('hasAnyPermission 满足任一即通过', () => {
    expect(hasAnyPermission(normal, ['user:delete', 'user:list'])).toBe(true)
    expect(hasAnyPermission(normal, ['user:delete'])).toBe(false)
  })

  it('hasAllPermissions 需全部满足', () => {
    expect(hasAllPermissions(normal, ['user:list', 'role:list'])).toBe(true)
    expect(hasAllPermissions(normal, ['user:list', 'user:delete'])).toBe(false)
  })

  it('hasRole 按角色码匹配', () => {
    expect(hasRole(normal, 'ops')).toBe(true)
    expect(hasRole(normal, 'superadmin')).toBe(false)
  })
})
