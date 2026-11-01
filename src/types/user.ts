/** 用户（列表/详情） */
export interface UserRead {
  id: number
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
  last_login?: string | null
  created_at?: string
  updated_at?: string
  /** 角色 code 列表（展示用） */
  roles?: string[]
  /** 角色 id 列表（分配角色用，mock 数据携带） */
  role_ids?: number[]
}

/** 创建用户 */
export interface UserCreate {
  username: string
  email: string
  password: string
  is_active?: boolean
  is_superuser?: boolean
}

/** 更新用户（部分字段） */
export interface UserUpdate {
  email?: string
  password?: string
  is_active?: boolean
  is_superuser?: boolean
}

/** 给用户分配角色 */
export interface AssignRolesParams {
  role_ids: number[]
}
