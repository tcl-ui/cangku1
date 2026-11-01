import * as roleApi from '@/apis/role.api'
import type { PageParams, PageResult, RoleCreate, RoleRead, RoleUpdate } from '@/types'

/** 角色业务：分页归一化 + 入参校验 */
export const roleService = {
  getRoles(params: PageParams = {}): Promise<PageResult<RoleRead>> {
    return roleApi.searchRoles({
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      keyword: params.keyword,
    })
  },

  getRole(id: number): Promise<RoleRead> {
    return roleApi.getRole(id)
  },

  async createRole(payload: RoleCreate): Promise<RoleRead> {
    if (!payload.code?.trim() || !payload.name?.trim()) {
      throw new Error('角色编码与名称不能为空')
    }
    return roleApi.createRole(payload)
  },

  updateRole(id: number, payload: RoleUpdate): Promise<RoleRead> {
    return roleApi.updateRole(id, payload)
  },

  deleteRole(id: number): Promise<void> {
    return roleApi.deleteRole(id)
  },

  assignPermissions(id: number, permissionIds: number[]): Promise<RoleRead> {
    return roleApi.assignPermissions(id, { permission_ids: permissionIds })
  },
}
