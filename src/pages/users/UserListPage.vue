<template>
  <div>
    <PageHeader title="用户管理" description="系统用户的分页检索与维护">
      <template #actions>
        <PermissionButton permission="user:create" variant="primary" @click="handleCreate">
          新建用户
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索用户名或邮箱"
        @keyup.enter="search"
      />
      <button class="btn btn-ghost" type="button" @click="search">搜索</button>
    </div>

    <div class="card">
      <LoadingState v-if="store.loading" />
      <EmptyState v-else-if="store.users.length === 0" text="暂无用户数据" />
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in store.users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="badge" :class="user.is_active ? 'badge--ok' : 'badge--muted'">
                {{ user.is_active ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ (user.roles ?? []).join('、') || '—' }}</td>
            <td>
              <PermissionButton permission="user:delete" variant="danger" @click="handleDelete(user)">
                删除
              </PermissionButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="btn btn-ghost" type="button" :disabled="store.page <= 1" @click="go(store.page - 1)">
        上一页
      </button>
      <span class="pagination__info">第 {{ store.page }} 页 / 共 {{ store.total }} 条</span>
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="store.page * store.pageSize >= store.total"
        @click="go(store.page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user.store'
import { userService } from '@/services/user.service'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { UserRead } from '@/types'

const store = useUserStore()
const keyword = ref('')

function search(): void {
  store.fetchUsers({ keyword: keyword.value || undefined })
}

function go(page: number): void {
  store.fetchUsers({ page, keyword: keyword.value || undefined })
}

async function handleDelete(user: UserRead): Promise<void> {
  if (!window.confirm(`确认删除用户「${user.username}」？`)) return
  await store.removeUser(user.id)
}

async function handleCreate(): Promise<void> {
  const name = window.prompt('请输入用户名')
  if (!name) return
  try {
    await userService.createUser({ username: name, email: `${name}@example.com`, password: '123456' })
    search()
  } catch (e) {
    window.alert(e instanceof Error ? e.message : '创建失败')
  }
}

onMounted(() => store.fetchUsers())
</script>
