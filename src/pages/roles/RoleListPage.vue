<template>
  <div>
    <PageHeader title="角色管理" description="角色的检索、创建与权限分配">
      <template #actions>
        <PermissionButton permission="role:create" variant="primary" @click="openCreate">
          新建角色
        </PermissionButton>
      </template>
    </PageHeader>

    <div class="two-pane">
      <!-- 左栏：角色列表 -->
      <div class="card role-list">
        <div class="card-head">
          <h2 class="card-head__title">角色列表</h2>
        </div>
        <div v-if="loading" class="card-body">
          <LoadingState />
        </div>
        <template v-else>
          <div
            v-for="role in roles"
            :key="role.id"
            class="role-item"
            :class="{ active: selected?.id === role.id }"
            @click="selectRole(role)"
          >
            <span class="role-item__icon">{{ role.code.charAt(0).toUpperCase() }}</span>
            <div class="role-item__info">
              <div class="role-item__name">{{ role.name }}</div>
              <div class="role-item__desc">{{ role.description || '—' }}</div>
            </div>
            <span class="role-item__count">{{ role.permissions?.length ?? 0 }}</span>
          </div>
          <div v-if="roles.length === 0" class="card-body">
            <EmptyState text="暂无角色" />
          </div>
        </template>
      </div>

      <!-- 右栏：权限树 -->
      <div class="card role-detail">
        <div v-if="selected" class="card-head">
          <div>
            <h2 class="card-head__title">{{ selected.name }}</h2>
            <p style="font-size: 12px; color: var(--text-muted)">{{ selected.description }}</p>
          </div>
          <div class="card-head__tools">
            <PermissionButton
              permission="role:delete"
              variant="danger"
              sm
              @click="handleDelete(selected)"
            >
              删除角色
            </PermissionButton>
          </div>
        </div>
        <template v-if="selected">
          <PermissionTree
            v-model="selectedCodes"
            :key="selected.id"
            :modules="ALL_MODULES"
          />
          <div class="sticky-bar">
            <span class="sticky-bar__count">已选 <b>{{ selectedCodes.length }}</b> 项权限</span>
            <PermissionButton permission="role:assign_permissions" variant="violet" sm @click="saveAssignment">
              保存分配
            </PermissionButton>
          </div>
        </template>
      </div>
    </div>

    <!-- 新建角色 -->
    <Modal v-model="createOpen" title="新建角色" @close="createOpen = false">
      <label class="field">
        <span class="field__label">角色编码</span>
        <input v-model="createForm.code" class="input mono" placeholder="如 ops / kb_editor" />
      </label>
      <label class="field">
        <span class="field__label">角色名称</span>
        <input v-model="createForm.name" class="input" />
      </label>
      <label class="field">
        <span class="field__label">描述</span>
        <input v-model="createForm.description" class="input" />
      </label>
      <p v-if="createError" class="form-error">{{ createError }}</p>
      <template #footer>
        <button class="btn btn-outline" type="button" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="submitting" @click="submitCreate">
          创建
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToastStore } from '@/store/toast.store'
import { roleService } from '@/services/role.service'
import { PERMISSION_GROUPS, idsOfCodes } from '@/constants/rbac.catalog'
import PageHeader from '@/components/common/PageHeader.vue'
import PermissionButton from '@/components/common/PermissionButton.vue'
import PermissionTree from '@/components/common/PermissionTree.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { RoleRead } from '@/types'

const ALL_MODULES = PERMISSION_GROUPS.map((g) => g.module)

const roles = ref<RoleRead[]>([])
const loading = ref(false)
const selected = ref<RoleRead | null>(null)
/** 权限树勾选（code 集合，与 selected.permissions 同步） */
const selectedCodes = ref<string[]>([])

const createOpen = ref(false)
const submitting = ref(false)
const createError = ref('')
const createForm = ref({ code: '', name: '', description: '' })

const toastStore = useToastStore()

/** 校验：勾选集合与角色现有权限一致时可保存 */
const dirty = computed(() => {
  if (!selected.value) return false
  const original = selected.value.permissions ?? []
  return selectedCodes.value.length !== original.length || selectedCodes.value.some((c) => !original.includes(c))
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await roleService.getRoles({ page: 1, page_size: 100 })
    roles.value = result.items
    if (!selected.value && roles.value.length > 0) {
      selectRole(roles.value[0])
    }
  } finally {
    loading.value = false
  }
}

function selectRole(role: RoleRead): void {
  selected.value = role
  selectedCodes.value = [...(role.permissions ?? [])].sort()
}

async function saveAssignment(): Promise<void> {
  if (!selected.value) return
  if (!dirty.value) {
    toastStore.toast('无变更可保存', 'info')
    return
  }
  try {
    const permissionIds = idsOfCodes(selectedCodes.value)
    const updated = await roleService.assignPermissions(selected.value.id, permissionIds)
    selected.value = updated
    // 同步左栏列表中的权限数
    const inList = roles.value.find((r) => r.id === updated.id)
    if (inList) inList.permissions = updated.permissions
    toastStore.toast(`已保存 ${updated.permissions?.length ?? 0} 项权限`, 'success')
  } catch (e) {
    toastStore.toast(e instanceof Error ? e.message : '保存失败', 'danger')
  }
}

async function handleDelete(role: RoleRead): Promise<void> {
  if (!window.confirm(`确认删除角色「${role.name}」？删除后用户将失去该角色权限。`)) return
  try {
    await roleService.deleteRole(role.id)
    if (selected.value?.id === role.id) selected.value = null
    await load()
    toastStore.toast('角色已删除', 'success')
  } catch (e) {
    toastStore.toast(e instanceof Error ? e.message : '删除失败', 'danger')
  }
}

function openCreate(): void {
  createForm.value = { code: '', name: '', description: '' }
  createError.value = ''
  createOpen.value = true
}

async function submitCreate(): Promise<void> {
  submitting.value = true
  createError.value = ''
  try {
    const created = await roleService.createRole({
      code: createForm.value.code,
      name: createForm.value.name,
      description: createForm.value.description || undefined,
    })
    createOpen.value = false
    await load()
    selectRole(created)
    toastStore.toast('角色已创建', 'success')
  } catch (e) {
    createError.value = e instanceof Error ? e.message : '创建失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
