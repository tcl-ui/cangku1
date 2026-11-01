import type { Router } from 'vue-router'
import { useAuthStore } from '@/store/auth.store'

/** 全局导航守卫：登录态 + 权限码双重校验 */
export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // 公开页面：已登录访问 /login 时回到工作台
    if (to.meta.public) {
      if (to.name === 'login' && auth.isLoggedIn) {
        return { name: 'dashboard' }
      }
      return true
    }

    // 未登录访问受保护页面 → 登录页
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // 已登录但内存中无用户信息（如页面刷新）→ 从 /me 恢复权限
    if (auth.isLoggedIn && !auth.user) {
      try {
        await auth.loadProfile()
      } catch {
        auth.logout()
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    }

    // 页面级权限校验
    const permission = to.meta.permission
    if (permission && !auth.can(permission)) {
      return { name: 'forbidden' }
    }

    return true
  })
}
