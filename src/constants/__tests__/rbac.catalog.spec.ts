import { describe, expect, it } from 'vitest'
import {
  ALL_PERMISSION_CODES,
  PERMISSION_GROUPS,
  READ_ONLY_PERMISSION_CODES,
  moduleOfCode,
  permissionNameOf,
} from '@/constants/rbac.catalog'

describe('rbac.catalog', () => {
  it('权限码目录共 67 项且去重', () => {
    expect(new Set(ALL_PERMISSION_CODES).size).toBe(67)
  })

  it('覆盖 12 个模块分组', () => {
    expect(PERMISSION_GROUPS.length).toBe(12)
  })

  it('只读权限码仅含 :list / :view', () => {
    expect(READ_ONLY_PERMISSION_CODES.length).toBeGreaterThan(0)
    expect(READ_ONLY_PERMISSION_CODES.every((c) => /:(list|view)$/.test(c))).toBe(true)
  })

  it('模块与权限名查询命中', () => {
    expect(moduleOfCode('user:list')?.name).toBe('用户管理')
    expect(permissionNameOf('role:assign_permissions')).toBe('分配权限')
    expect(permissionNameOf('unknown:code')).toBe('unknown:code')
  })
})
