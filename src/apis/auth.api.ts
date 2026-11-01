import { http } from './http'
import type { CaptchaResult, CurrentUser, LoginParams, TokenResponse } from '@/types'

/** 获取验证码：GET /api/v1/captcha */
export function getCaptcha(): Promise<CaptchaResult> {
  return http.get<CaptchaResult, CaptchaResult>('/api/v1/captcha')
}

/** 登录：POST /api/v1/auth/login */
export function login(params: LoginParams): Promise<TokenResponse> {
  return http.post<TokenResponse, TokenResponse>('/api/v1/auth/login', params)
}

/** 获取当前登录用户：GET /api/v1/users/me */
export function getCurrentUser(): Promise<CurrentUser> {
  return http.get<CurrentUser, CurrentUser>('/api/v1/users/me')
}
