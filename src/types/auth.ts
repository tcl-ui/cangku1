/** 验证码结果 */
export interface CaptchaResult {
  key: string
  image: string
}

/** 登录参数 */
export interface LoginParams {
  username: string
  password: string
  captcha_key?: string
  captcha_code?: string
}

/** 当前登录用户（含角色与权限码，供前端做权限判断） */
export interface CurrentUser {
  id: number
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
  roles: string[]
  permissions: string[]
}

/** 登录响应 */
export interface TokenResponse {
  access_token: string
  token_type: string
  user: CurrentUser
}
