import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string
    /** 是否公开（无需登录） */
    public?: boolean
    /** 是否需要登录 */
    requiresAuth?: boolean
    /** 访问所需的权限码 */
    permission?: string
  }
}
