/** 角色 */
export interface RoleRead {
  id: number
  code: string
  name: string
  description?: string | null
  permissions?: string[]
}

/** 创建角色 */
export interface RoleCreate {
  code: string
  name: string
  description?: string
}

/** 更新角色 */
export interface RoleUpdate {
  name?: string
  description?: string
}

/** 给角色分配权限 */
export interface AssignPermissionsParams {
  permission_ids: number[]
}
