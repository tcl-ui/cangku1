import { http } from './http'
import type {
  AssignRolesParams,
  PageParams,
  PageResult,
  UserCreate,
  UserRead,
  UserUpdate,
} from '@/types'

/** 分页搜索用户：GET /api/v1/users/search */
export function searchUsers(params: PageParams = {}): Promise<PageResult<UserRead>> {
  return http.get<PageResult<UserRead>, PageResult<UserRead>>('/api/v1/users/search', { params })
}

/** 用户列表：GET /api/v1/users */
export function listUsers(): Promise<UserRead[]> {
  return http.get<UserRead[], UserRead[]>('/api/v1/users')
}

/** 用户详情：GET /api/v1/users/{id} */
export function getUser(id: number): Promise<UserRead> {
  return http.get<UserRead, UserRead>(`/api/v1/users/${id}`)
}

/** 创建用户：POST /api/v1/users */
export function createUser(payload: UserCreate): Promise<UserRead> {
  return http.post<UserRead, UserRead>('/api/v1/users', payload)
}

/** 更新用户：PUT /api/v1/users/{id} */
export function updateUser(id: number, payload: UserUpdate): Promise<UserRead> {
  return http.put<UserRead, UserRead>(`/api/v1/users/${id}`, payload)
}

/** 删除用户：DELETE /api/v1/users/{id} */
export function deleteUser(id: number): Promise<void> {
  return http.delete<void, void>(`/api/v1/users/${id}`)
}

/** 分配用户角色：PUT /api/v1/users/{id}/roles */
export function assignRoles(id: number, payload: AssignRolesParams): Promise<UserRead> {
  return http.put<UserRead, UserRead>(`/api/v1/users/${id}/roles`, payload)
}
