<template>
  <div>
    <PageHeader title="工作台" description="欢迎使用辰光Agent平台" />

    <div class="stat-grid">
      <div class="card stat">
        <span class="stat__value">{{ counts.users }}</span>
        <span class="stat__label">用户总数</span>
      </div>
      <div class="card stat">
        <span class="stat__value">{{ counts.roles }}</span>
        <span class="stat__label">角色总数</span>
      </div>
      <div class="card stat">
        <span class="stat__value">{{ counts.permissions }}</span>
        <span class="stat__label">权限总数</span>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 12px">当前账号</h3>
      <p>用户名：{{ auth.user?.username ?? '—' }}</p>
      <p>角色：{{ auth.roles.join('、') || '无' }}</p>
      <p>权限码：{{ auth.permissions.length }} 项</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAuthStore } from '@/store/auth.store'
import { userService } from '@/services/user.service'
import { roleService } from '@/services/role.service'
import { permissionService } from '@/services/permission.service'
import PageHeader from '@/components/common/PageHeader.vue'

const auth = useAuthStore()
const counts = reactive({ users: 0, roles: 0, permissions: 0 })

onMounted(async () => {
  const [users, roles, permissions] = await Promise.all([
    userService.getUsers({ page: 1, page_size: 1 }),
    roleService.getRoles({ page: 1, page_size: 1 }),
    permissionService.getPermissions({ page: 1, page_size: 1 }),
  ])
  counts.users = users.total
  counts.roles = roles.total
  counts.permissions = permissions.total
})
</script>
