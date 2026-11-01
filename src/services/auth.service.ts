import * as authApi from '@/apis/auth.api'
import { tokenStorage } from '@/apis/token'
import type { CaptchaResult, CurrentUser, LoginParams } from '@/types'

/** 认证业务：编排 API 调用 + token 生命周期管理 */
export const authService = {
  getCaptcha(): Promise<CaptchaResult> {
    return authApi.getCaptcha()
  },

  /** 登录成功后持久化 token，并返回当前用户 */
  async login(params: LoginParams): Promise<CurrentUser> {
    const token = await authApi.login(params)
    tokenStorage.set(token.access_token)
    return token.user
  },

  logout(): void {
    tokenStorage.remove()
  },

  isLoggedIn(): boolean {
    return tokenStorage.get() !== null
  },

  fetchCurrentUser(): Promise<CurrentUser> {
    return authApi.getCurrentUser()
  },
}
