import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CurrentUser, LoginParams } from '@/types'
import { authService } from '@/services/auth.service'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
} from '@/services/access.service'

/** 认证与权限状态：登录态 + 当前用户 + 权限判断入口 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => authService.isLoggedIn())
  const isSuperuser = computed(() => user.value?.is_superuser ?? false)
  const permissions = computed(() => user.value?.permissions ?? [])
  const roles = computed(() => user.value?.roles ?? [])

  async function login(params: LoginParams): Promise<CurrentUser> {
    loading.value = true
    try {
      const current = await authService.login(params)
      user.value = current
      return current
    } finally {
      loading.value = false
    }
  }

  /** 页面刷新后从 /me 恢复用户与权限 */
  async function loadProfile(): Promise<CurrentUser> {
    const current = await authService.fetchCurrentUser()
    user.value = current
    return current
  }

  function logout(): void {
    authService.logout()
    user.value = null
  }

  function can(code: string): boolean {
    return hasPermission(user.value, code)
  }

  function canAny(codes: string[]): boolean {
    return hasAnyPermission(user.value, codes)
  }

  function canAll(codes: string[]): boolean {
    return hasAllPermissions(user.value, codes)
  }

  function hasAnyRole(codes: string[]): boolean {
    return codes.some((code) => hasRole(user.value, code))
  }

  return {
    user,
    loading,
    isLoggedIn,
    isSuperuser,
    permissions,
    roles,
    login,
    loadProfile,
    logout,
    can,
    canAny,
    canAll,
    hasAnyRole,
  }
})
