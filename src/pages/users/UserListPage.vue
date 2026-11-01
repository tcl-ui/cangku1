<template>
  <div>
    <PageHeader title="用户管理" description="系统用户的检索、创建与角色分配">
      <template #actions>
        <PermissionButton permission="user:create" variant="primary" @click="openCreate">
          新建用户
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="card">
      <div class="card-head">
        <h2 class="card-head__title">用户列表</h2>
        <div class="card-head__tools">
          <div class="search">
            <input
              v-model="keyword"
              class="input"
              placeholder="搜索用户名或邮箱"
              @keyup.enter="search"
            />
          </div>
          <button class="btn btn-outline" type="button" @click="search">搜索</button>
        </div>
      </div>

      <div v-if="store.loading" class="card-body">
        <LoadingState />
      </div>
      <div v-else-if="store.users.length === 0" class="card-body">
        <EmptyState text="暂无用户数据" />
      </div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in store.users" :key="user.id">
              <td>{{ user.id }}</td>
              <td class="mono">{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span v-for="role in user.roles ?? []" :key="role" class="badge badge--violet" style="margin-right: 4px">
                  {{ role }}
                </span>
                <span v-if="(user.roles ?? []).length === 0" class="badge badge--slate">无角色</span>
              </td>
              <td>
                <span class="badge" :class="user.is_active ? 'badge--green' : 'badge--red'">
                  {{ user.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ formatTime(user.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <PermissionButton
                    permission="user:assign_roles"
                    variant="ghost"
                    sm
                    @click="openAssignRoles(user)"
                  >
                    分配角色
                  </PermissionButton>
                  <PermissionButton permission="user:update" variant="ghost" sm @click="toggleActive(user)">
                    {{ user.is_active ? '禁用' : '启用' }}
                  </PermissionButton>
                  <PermissionButton permission="user:delete" variant="danger" sm @click="handleDelete(user)">
                    删除
                  </PermissionButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>共 {{ store.total }} 条</span>
        <div class="pagination__pages">
          <button
            :disabled="store.page <= 1"
            @click="go(store.page - 1)"
          >
            上一页
          </button>
          <button
            :disabled="store.page * store.pageSize >= store.total"
            @click="go(store.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 新建用户 -->
    <Modal v-model="createOpen" title="新建用户" @close="createOpen = false">
      <label class="field">
        <span class="field__label">用户名</span>
        <input v-model="createForm.username" class="input" />
      </label>
      <label class="field">
        <span class="field__label">邮箱</span>
        <input v-model="createForm.email" class="input" />
      </label>
      <label class="field">
        <span class="field__label">初始密码</span>
        <input v-model="createForm.password" type="password" class="input" />
      </label>
      <p v-if="createError" class="form-error">{{ createError }}</p>
      <template #footer>
        <button class="btn btn-outline" type="button" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="submitting" @click="submitCreate">
          创建
        </button>
      </template>
    </Modal>

    <!-- 分配角色 -->
    <Modal
      v-model="assignOpen"
      :title="`分配角色 — ${assignTarget?.username ?? ''}`"
      @close="assignOpen = false"
    >
      <div class="pill-group">
        <span
          v-for="role in allRoles"
          :key="role.id"
          class="pill"
          :class="{ active: selectedRoleIds.includes(role.id) }"
          @click="toggleRole(role.id)"
        >
          {{ role.name }}
        </span>
      </div>
      <p v-if="assignError" class="form-error">{{ assignError }}</p>
      <template #footer>
        <button class="btn btn-outline" type="button" @click="assignOpen = false">取消</button>
        <button
          class="btn btn-violet"
          type="button"
          :disabled="submitting"
          @click="submitAssignRoles"
        >
          保存分配
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user.store'
import { useToastStore } from '@/store/toast.store'
import { roleService } from '@/services/role.service'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { RoleRead, UserRead } from '@/types'

const store = useUserStore()
const toastStore = useToastStore()
const keyword = ref('')

const createOpen = ref(false)
const submitting = ref(false)
const createError = ref('')
const createForm = ref({ username: '', email: '', password: '' })

const assignOpen = ref(false)
const assignTarget = ref<UserRead | null>(null)
const allRoles = ref<RoleRead[]>([])
const selectedRoleIds = ref<number[]>([])
const assignError = ref('')

function formatTime(iso?: string): string {
  return iso ? iso.slice(0, 10) : '—'
}

function search(): void {
  store.fetchUsers({ page: 1, keyword: keyword.value || undefined })
}

function go(page: number): void {
  store.fetchUsers({ page, keyword: keyword.value || undefined })
}

async function handleDelete(user: UserRead): Promise<void> {
  if (!window.confirm(`确认删除用户「${user.username}」？`)) return
  try {
    await store.removeUser(user.id)
    toastStore.toast('用户已删除', 'success')
  } catch (e) {
    toastStore.toast(e instanceof Error ? e.message : '删除失败', 'danger')
  }
}

async function toggleActive(user: UserRead): Promise<void> {
  try {
    const { userService } = await import('@/services/user.service')
    await userService.updateUser(user.id, { is_active: !user.is_active })
    await store.fetchUsers()
    toastStore.toast('状态已更新', 'success')
  } catch (e) {
    toastStore.toast(e instanceof Error ? e.message : '操作失败', 'danger')
  }
}

function openCreate(): void {
  createForm.value = { username: '', email: '', password: '' }
  createError.value = ''
  createOpen.value = true
}

async function submitCreate(): Promise<void> {
  submitting.value = true
  createError.value = ''
  try {
    await store.create({
      username: createForm.value.username,
      email: createForm.value.email,
      password: createForm.value.password || '123456',
    })
    createOpen.value = false
    toastStore.toast('用户已创建', 'success')
  } catch (e) {
    createError.value = e instanceof Error ? e.message : '创建失败'
  } finally {
    submitting.value = false
  }
}

async function openAssignRoles(user: UserRead): Promise<void> {
  assignTarget.value = user
  assignError.value = ''
  selectedRoleIds.value = user.role_ids ?? []
  allRoles.value = await roleService.getAllRoles()
  assignOpen.value = true
}

function toggleRole(id: number): void {
  const next = new Set(selectedRoleIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedRoleIds.value = Array.from(next)
}

async function submitAssignRoles(): Promise<void> {
  if (!assignTarget.value) return
  submitting.value = true
  assignError.value = ''
  try {
    await store.assignRoles(assignTarget.value.id, selectedRoleIds.value)
    assignOpen.value = false
    toastStore.toast('角色已保存', 'success')
  } catch (e) {
    assignError.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => store.fetchUsers())
</script>
