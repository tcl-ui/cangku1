import type { RouteRecordRaw } from 'vue-router'

/** 路由表：集中登记，meta 驱动守卫与菜单 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { title: '工作台', requiresAuth: true },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/users/UserListPage.vue'),
        meta: { title: '用户管理', requiresAuth: true, permission: 'user:list' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/pages/roles/RoleListPage.vue'),
        meta: { title: '角色管理', requiresAuth: true, permission: 'role:list' },
      },
      {
        path: 'permissions',
        name: 'permissions',
        component: () => import('@/pages/permissions/PermissionListPage.vue'),
        meta: { title: '权限管理', requiresAuth: true, permission: 'permission:list' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/pages/error/ForbiddenPage.vue'),
    meta: { title: '无权限' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/error/NotFoundPage.vue'),
    meta: { title: '页面不存在' },
  },
]
