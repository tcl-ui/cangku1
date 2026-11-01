<template>
  <div>
    <PageHeader title="工作台" description="平台运行概览与当前账号权限摘要" />

    <div class="notice">
      <span>
        当前身份：<b>{{ auth.user?.username ?? '—' }}</b>
        <template v-if="auth.isSuperuser">（超级管理员，拥有全部权限）</template>
        <template v-else>（{{ auth.permissions.length }} 项权限）</template>
      </span>
    </div>

    <div class="stat-grid">
      <div class="card stat-card">
        <div class="stat-card__label">用户总数</div>
        <div class="stat-card__value">{{ stats.users }}</div>
        <div class="stat-card__delta">含启用与禁用账号</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__label">角色总数</div>
        <div class="stat-card__value">{{ stats.roles }}</div>
        <div class="stat-card__delta">内置 4 类 + 自定义</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__label">权限码目录</div>
        <div class="stat-card__value">{{ stats.permissions }}</div>
        <div class="stat-card__delta">覆盖 12 个业务模块</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__label">当前账号权限</div>
        <div class="stat-card__value">{{ auth.isSuperuser ? '全部' : auth.permissions.length }}</div>
        <div class="stat-card__delta">
          角色：{{ auth.roles.join('、') || '无' }}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h2 class="card-head__title">当前身份与权限</h2>
      </div>
      <div class="card-body">
        <div v-if="auth.isSuperuser" class="notice notice--info">
          超级管理员（is_superuser）绕过全部权限校验，拥有平台所有能力。
        </div>
        <div v-else>
          <p style="margin-bottom: 8px; font-size: 14px">
            已授予 <b>{{ auth.permissions.length }}</b> 项权限码：
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 200px; overflow-y: auto">
            <span
              v-for="code in auth.permissions"
              :key="code"
              class="mod-badge"
              :class="moduleOfCode(code)?.color ?? 'mod-dashboard'"
            >
              <span class="mod-badge__dot" />
              <span class="mono">{{ code }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAuthStore } from '@/store/auth.store'
import { userService } from '@/services/user.service'
import { roleService } from '@/services/role.service'
import { permissionService } from '@/services/permission.service'
import { moduleOfCode } from '@/constants/rbac.catalog'
import PageHeader from '@/components/common/PageHeader.vue'

const auth = useAuthStore()
const stats = reactive({ users: 0, roles: 0, permissions: 0 })

onMounted(async () => {
  const [users, roles, permissions] = await Promise.all([
    userService.getUsers({ page: 1, page_size: 1 }),
    roleService.getRoles({ page: 1, page_size: 1 }),
    permissionService.getPermissions({ page: 1, page_size: 1 }),
  ])
  stats.users = users.total
  stats.roles = roles.total
  stats.permissions = permissions.total
})
</script>
