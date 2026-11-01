import { http } from './http'
import type {
  PageParams,
  PageResult,
  PermissionCreate,
  PermissionRead,
  PermissionUpdate,
} from '@/types'

/** 分页搜索权限：GET /api/v1/permissions/search */
export function searchPermissions(params: PageParams = {}): Promise<PageResult<PermissionRead>> {
  return http.get<PageResult<PermissionRead>, PageResult<PermissionRead>>(
    '/api/v1/permissions/search',
    { params },
  )
}

/** 权限列表：GET /api/v1/permissions */
export function listPermissions(): Promise<PermissionRead[]> {
  return http.get<PermissionRead[], PermissionRead[]>('/api/v1/permissions')
}

/** 权限详情：GET /api/v1/permissions/{id} */
export function getPermission(id: number): Promise<PermissionRead> {
  return http.get<PermissionRead, PermissionRead>(`/api/v1/permissions/${id}`)
}

/** 创建权限：POST /api/v1/permissions */
export function createPermission(payload: PermissionCreate): Promise<PermissionRead> {
  return http.post<PermissionRead, PermissionRead>('/api/v1/permissions', payload)
}

/** 更新权限：PUT /api/v1/permissions/{id} */
export function updatePermission(id: number, payload: PermissionUpdate): Promise<PermissionRead> {
  return http.put<PermissionRead, PermissionRead>(`/api/v1/permissions/${id}`, payload)
}

/** 删除权限：DELETE /api/v1/permissions/{id} */
export function deletePermission(id: number): Promise<void> {
  return http.delete<void, void>(`/api/v1/permissions/${id}`)
}
