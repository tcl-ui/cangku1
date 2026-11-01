import { http } from './http'
import type {
  AssignPermissionsParams,
  PageParams,
  PageResult,
  RoleCreate,
  RoleRead,
  RoleUpdate,
} from '@/types'

/** 分页搜索角色：GET /api/v1/roles/search */
export function searchRoles(params: PageParams = {}): Promise<PageResult<RoleRead>> {
  return http.get<PageResult<RoleRead>, PageResult<RoleRead>>('/api/v1/roles/search', { params })
}

/** 角色列表：GET /api/v1/roles */
export function listRoles(): Promise<RoleRead[]> {
  return http.get<RoleRead[], RoleRead[]>('/api/v1/roles')
}

/** 角色详情：GET /api/v1/roles/{id} */
export function getRole(id: number): Promise<RoleRead> {
  return http.get<RoleRead, RoleRead>(`/api/v1/roles/${id}`)
}

/** 创建角色：POST /api/v1/roles */
export function createRole(payload: RoleCreate): Promise<RoleRead> {
  return http.post<RoleRead, RoleRead>('/api/v1/roles', payload)
}

/** 更新角色：PUT /api/v1/roles/{id} */
export function updateRole(id: number, payload: RoleUpdate): Promise<RoleRead> {
  return http.put<RoleRead, RoleRead>(`/api/v1/roles/${id}`, payload)
}

/** 删除角色：DELETE /api/v1/roles/{id} */
export function deleteRole(id: number): Promise<void> {
  return http.delete<void, void>(`/api/v1/roles/${id}`)
}

/** 分配角色权限：PUT /api/v1/roles/{id}/permissions */
export function assignPermissions(id: number, payload: AssignPermissionsParams): Promise<RoleRead> {
  return http.put<RoleRead, RoleRead>(`/api/v1/roles/${id}/permissions`, payload)
}
