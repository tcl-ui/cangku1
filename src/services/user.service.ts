import * as userApi from '@/apis/user.api'
import type { PageParams, PageResult, UserCreate, UserRead, UserUpdate } from '@/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 统一分页参数默认值，避免调用方遗漏 */
function normalizeParams(params: PageParams): PageParams {
  return {
    page: params.page ?? 1,
    page_size: params.page_size ?? 10,
    keyword: params.keyword,
  }
}

/** 用户业务：分页归一化 + 入参校验（业务规则集中在此层） */
export const userService = {
  getUsers(params: PageParams = {}): Promise<PageResult<UserRead>> {
    return userApi.searchUsers(normalizeParams(params))
  },

  getUser(id: number): Promise<UserRead> {
    return userApi.getUser(id)
  },

  async createUser(payload: UserCreate): Promise<UserRead> {
    if (!payload.username?.trim()) throw new Error('用户名不能为空')
    if (!EMAIL_RE.test(payload.email)) throw new Error('邮箱格式不正确')
    return userApi.createUser(payload)
  },

  async updateUser(id: number, payload: UserUpdate): Promise<UserRead> {
    if (payload.email && !EMAIL_RE.test(payload.email)) throw new Error('邮箱格式不正确')
    return userApi.updateUser(id, payload)
  },

  deleteUser(id: number): Promise<void> {
    return userApi.deleteUser(id)
  },

  assignRoles(id: number, roleIds: number[]): Promise<UserRead> {
    return userApi.assignRoles(id, { role_ids: roleIds })
  },
}
