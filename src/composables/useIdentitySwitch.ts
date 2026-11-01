import { ref } from 'vue'
import { useAuthStore } from '@/store/auth.store'
import { USE_MOCK } from '@/apis/http'

type IdentityKey = 'admin' | 'viewer'

export interface Identity {
  key: IdentityKey
  label: string
  /** 切换时登录的 mock 用户名 */
  username: string
}

/** 演示身份：仅 Mock 模式可用，切换后重新登录以刷新权限 */
export const IDENTITIES: Identity[] = [
  { key: 'admin', label: '超级管理员', username: 'admin' },
  { key: 'viewer', label: '访客（只读）', username: 'viewer' },
]

/**
 * 顶栏「演示身份」分段控件逻辑（对齐原型 rbac.js 的 setIdentity）：
 * 切换身份 = 登出当前账号 + 登录目标 mock 账号，store 中的权限随之刷新，
 * 菜单/按钮/统计卡片自动重算。
 */
export function useIdentitySwitch() {
  const auth = useAuthStore()
  const active = ref<IdentityKey>(auth.isSuperuser ? 'admin' : 'viewer')
  const switching = ref(false)

  async function switchTo(identity: Identity): Promise<void> {
    if (!USE_MOCK || switching.value) return
    switching.value = true
    try {
      auth.logout()
      await auth.login({ username: identity.username, password: identity.username + '123' })
      active.value = identity.key
    } finally {
      switching.value = false
    }
  }

  return { active, switching, switchTo }
}
