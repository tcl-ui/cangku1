<template>
  <div>
    <PageHeader title="权限管理" description="权限码目录的检索、创建与删除">
      <template #actions>
        <PermissionButton permission="permission:create" variant="primary" @click="openCreate">
          新建权限
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="card">
      <div class="card-head">
        <h2 class="card-head__title">权限码目录</h2>
        <div class="card-head__tools">
          <div class="search">
            <input
              v-model="keyword"
              class="input"
              placeholder="搜索权限编码或名称"
              @keyup.enter="search"
            />
          </div>
          <button class="btn btn-outline" type="button" @click="search">搜索</button>
        </div>
      </div>

      <div v-if="loading" class="card-body">
        <LoadingState />
      </div>
      <div v-else-if="items.length === 0" class="card-body">
        <EmptyState text="暂无权限数据" />
      </div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>模块</th>
              <th>编码</th>
              <th>名称</th>
              <th>描述</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in items" :key="permission.id">
              <td>{{ permission.id }}</td>
              <td>
                <span
                  class="mod-badge"
                  :class="moduleOfCode(permission.code)?.color ?? 'mod-dashboard'"
                >
                  <span class="mod-badge__dot" />
                  {{ moduleOfCode(permission.code)?.name ?? '其他' }}
                </span>
              </td>
              <td class="code">{{ permission.code }}</td>
              <td>{{ permission.name }}</td>
              <td style="color: var(--text-muted); font-size: 13px">
                {{ permission.description || '—' }}
              </td>
              <td>
                <div class="row-actions">
                  <PermissionButton
                    permission="permission:update"
                    variant="ghost"
                    sm
                    @click="openEdit(permission)"
                  >
                    编辑
                  </PermissionButton>
                  <PermissionButton
                    permission="permission:delete"
                    variant="danger"
                    sm
                    @click="handleDelete(permission)"
                  >
                    删除
                  </PermissionButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <div class="pagination__pages">
          <button :disabled="page <= 1" @click="go(page - 1)">上一页</button>
          <button :disabled="page * PAGE_SIZE >= total" @click="go(page + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 新建 / 编辑权限 -->
    <Modal
      v-model="formOpen"
      :title="editing ? `编辑权限 — ${editing.code}` : '新建权限'"
      @close="formOpen = false"
    >
      <label class="field">
        <span class="field__label">权限编码</span>
        <input
          v-model="form.code"
          class="input mono"
          :disabled="!!editing"
          placeholder="格式：模块:操作（如 agent:publish）"
        />
      </label>
      <label class="field">
        <span class="field__label">权限名称</span>
        <input v-model="form.name" class="input" />
      </label>
      <label class="field">
        <span class="field__label">描述</span>
        <input v-model="form.description" class="input" />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-outline" type="button" @click="formOpen = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="submitting" @click="submit">
          {{ editing ? '保存' : '创建' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToastStore } from '@/store/toast.store'
import { permissionService } from '@/services/permission.service'
import { moduleOfCode } from '@/constants/rbac.catalog'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { PermissionRead } from '@/types'

const PAGE_SIZE = 10
const toastStore = useToastStore()

const items = ref<PermissionRead[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const keyword = ref('')

const formOpen = ref(false)
const submitting = ref(false)
const editing = ref<PermissionRead | null>(null)
const form = ref({ code: '', name: '', description: '' })
const formError = ref('')

async function load(pageNo: number = page.value): Promise<void> {
  loading.value = true
  try {
    const result = await permissionService.getPermissions({
      page: pageNo,
      page_size: PAGE_SIZE,
      keyword: keyword.value || undefined,
    })
    items.value = result.items
    total.value = result.total
    page.value = result.page
  } finally {
    loading.value = false
  }
}

function search(): void {
  load(1)
}

function go(pageNo: number): void {
  load(pageNo)
}

async function handleDelete(permission: PermissionRead): Promise<void> {
  if (!window.confirm(`确认删除权限「${permission.name}」？删除后关联角色将失去该权限。`)) return
  try {
    await permissionService.deletePermission(permission.id)
    await load()
    toastStore.toast('权限已删除', 'success')
  } catch (e) {
    toastStore.toast(e instanceof Error ? e.message : '删除失败', 'danger')
  }
}

function openCreate(): void {
  editing.value = null
  form.value = { code: '', name: '', description: '' }
  formError.value = ''
  formOpen.value = true
}

function openEdit(permission: PermissionRead): void {
  editing.value = permission
  form.value = {
    code: permission.code,
    name: permission.name,
    description: permission.description ?? '',
  }
  formError.value = ''
  formOpen.value = true
}

async function submit(): Promise<void> {
  submitting.value = true
  formError.value = ''
  try {
    if (editing.value) {
      const updated = await permissionService.updatePermission(editing.value.id, {
        name: form.value.name,
        description: form.value.description || undefined,
      })
      items.value = items.value.map((p) => (p.id === updated.id ? updated : p))
      formOpen.value = false
      toastStore.toast('权限已更新', 'success')
    } else {
      await permissionService.createPermission({
        code: form.value.code,
        name: form.value.name,
        description: form.value.description || undefined,
      })
      formOpen.value = false
      await load(1)
      toastStore.toast('权限已创建', 'success')
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load())
</script>
