<template>
  <nav class="nav">
    <template v-for="group in visibleGroups" :key="group.label">
      <div v-if="group.label" class="nav__group">{{ group.label }}</div>
      <RouterLink
        v-for="item in group.items"
        :key="item.path"
        :to="item.path"
        class="nav__item"
        :class="{ active: $route.path === item.path }"
      >
        {{ item.label }}
      </RouterLink>
    </template>
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

interface MenuGroup {
  label?: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    items: [{ path: '/dashboard', label: '工作台' }],
  },
  {
    label: '系统管理',
    items: [
      { path: '/users', label: '用户管理', permission: 'user:list' },
      { path: '/roles', label: '角色管理', permission: 'role:list' },
      { path: '/permissions', label: '权限管理', permission: 'permission:list' },
    ],
  },
]

const auth = useAuthStore()

/** 无权限的菜单项自动隐藏；分组下无可见子项时隐藏整组（对齐原型 applyGating） */
const visibleGroups = computed(() =>
  menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || auth.can(item.permission)),
    }))
    .filter((group) => group.items.length > 0),
)
</script>
