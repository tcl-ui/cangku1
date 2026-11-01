/** 后端统一响应包装 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

/** 分页结果 */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

/** 通用分页查询参数 */
export interface PageParams {
  page?: number
  page_size?: number
  keyword?: string
}
