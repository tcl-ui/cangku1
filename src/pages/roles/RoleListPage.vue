<template>
  <div>
    <PageHeader title="角色管理" description="角色的检索、创建与删除">
      <template #actions>
        <PermissionButton permission="role:create" variant="primary" @click="handleCreate">
          新建角色
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索角色编码或名称" @keyup.enter="load" />
      <button class="btn btn-ghost" type="button" @click="load">搜索</button>
    </div>

    <div class="card">
      <LoadingState v-if="loading" />
      <EmptyState v-else-if="roles.length === 0" text="暂无角色数据" />
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>编码</th>
            <th>名称</th>
            <th>描述</th>
            <th>权限数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roles" :key="role.id">
            <td>{{ role.id }}</td>
            <td>{{ role.code }}</td>
            <td>{{ role.name }}</td>
            <td>{{ role.description || '—' }}</td>
            <td>{{ role.permissions?.length ?? 0 }}</td>
            <td>
              <PermissionButton permission="role:delete" variant="danger" @click="handleDelete(role)">
                删除
              </PermissionButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination__info">共 {{ total }} 条</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { roleService } from '@/services/role.service'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { RoleRead } from '@/types'

const roles = ref<RoleRead[]>([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await roleService.getRoles({ keyword: keyword.value || undefined })
    roles.value = result.items
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function handleDelete(role: RoleRead): Promise<void> {
  if (!window.confirm(`确认删除角色「${role.name}」？`)) return
  await roleService.deleteRole(role.id)
  await load()
}

async function handleCreate(): Promise<void> {
  const code = window.prompt('请输入角色编码（如 ops）')
  if (!code) return
  await roleService.createRole({ code, name: code })
  await load()
}

onMounted(load)
</script>
