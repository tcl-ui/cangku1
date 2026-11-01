import type { CurrentUser } from '@/types'

/**
 * 权限判断（纯函数，供 store / router / 组件复用）。
 * 超级管理员默认放行全部权限。
 */

export function hasPermission(user: CurrentUser | null, code: string): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  return user.permissions.includes(code)
}

export function hasAnyPermission(user: CurrentUser | null, codes: string[]): boolean {
  return codes.some((code) => hasPermission(user, code))
}

export function hasAllPermissions(user: CurrentUser | null, codes: string[]): boolean {
  return codes.every((code) => hasPermission(user, code))
}

export function hasRole(user: CurrentUser | null, code: string): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  return user.roles.includes(code)
}
