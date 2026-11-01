import * as permissionApi from '@/apis/permission.api'
import type {
  PageParams,
  PageResult,
  PermissionCreate,
  PermissionRead,
  PermissionUpdate,
} from '@/types'

/** 权限业务：分页归一化 + 入参校验 */
export const permissionService = {
  getPermissions(params: PageParams = {}): Promise<PageResult<PermissionRead>> {
    return permissionApi.searchPermissions({
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      keyword: params.keyword,
    })
  },

  getPermission(id: number): Promise<PermissionRead> {
    return permissionApi.getPermission(id)
  },

  async createPermission(payload: PermissionCreate): Promise<PermissionRead> {
    if (!payload.code?.trim() || !payload.name?.trim()) {
      throw new Error('权限编码与名称不能为空')
    }
    return permissionApi.createPermission(payload)
  },

  updatePermission(id: number, payload: PermissionUpdate): Promise<PermissionRead> {
    return permissionApi.updatePermission(id, payload)
  },

  deletePermission(id: number): Promise<void> {
    return permissionApi.deletePermission(id)
  },
}
