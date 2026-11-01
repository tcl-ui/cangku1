/** 权限 */
export interface PermissionRead {
  id: number
  code: string
  name: string
  description?: string | null
}

/** 创建权限 */
export interface PermissionCreate {
  code: string
  name: string
  description?: string
}

/** 更新权限 */
export interface PermissionUpdate {
  name?: string
  description?: string
}
