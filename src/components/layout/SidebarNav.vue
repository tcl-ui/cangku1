<template>
  <nav class="nav">
    <RouterLink
      v-for="item in visibleItems"
      :key="item.path"
      :to="item.path"
      class="nav__item"
      active-class="active"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth.store'

interface MenuItem {
  path: string
  label: string
  permission?: string
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: '工作台' },
  { path: '/users', label: '用户管理', permission: 'user:list' },
  { path: '/roles', label: '角色管理', permission: 'role:list' },
  { path: '/permissions', label: '权限管理', permission: 'permission:list' },
]

const auth = useAuthStore()

/** 无权限的菜单项自动隐藏 */
const visibleItems = computed(() =>
  menuItems.filter((item) => !item.permission || auth.can(item.permission)),
)
</script>
