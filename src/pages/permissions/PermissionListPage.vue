<template>
  <div>
    <PageHeader title="权限管理" description="权限码目录的检索、创建与删除">
      <template #actions>
        <PermissionButton permission="permission:create" variant="primary" @click="handleCreate">
          新建权限
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索权限编码或名称" @keyup.enter="load" />
      <button class="btn btn-ghost" type="button" @click="load">搜索</button>
    </div>

    <div class="card">
      <LoadingState v-if="loading" />
      <EmptyState v-else-if="permissions.length === 0" text="暂无权限数据" />
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>编码</th>
            <th>名称</th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="permission in permissions" :key="permission.id">
            <td>{{ permission.id }}</td>
            <td>{{ permission.code }}</td>
            <td>{{ permission.name }}</td>
            <td>{{ permission.description || '—' }}</td>
            <td>
              <PermissionButton
                permission="permission:delete"
                variant="danger"
                @click="handleDelete(permission)"
              >
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
import { permissionService } from '@/services/permission.service'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { PermissionRead } from '@/types'

const permissions = ref<PermissionRead[]>([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await permissionService.getPermissions({ keyword: keyword.value || undefined })
    permissions.value = result.items
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function handleDelete(permission: PermissionRead): Promise<void> {
  if (!window.confirm(`确认删除权限「${permission.name}」？`)) return
  await permissionService.deletePermission(permission.id)
  await load()
}

async function handleCreate(): Promise<void> {
  const code = window.prompt('请输入权限编码（格式：模块:操作，如 agent:publish）')
  if (!code) return
  await permissionService.createPermission({ code, name: code })
  await load()
}

onMounted(load)
</script>
