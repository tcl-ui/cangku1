<template>
  <div class="perm-tree">
    <div
      v-for="group in groups"
      :key="group.module"
      class="perm-group"
      :class="{ 'perm-group--collapsed': collapsed[group.module] }"
    >
      <div class="perm-group__head" @click="toggle(group.module)">
        <span class="mod-badge" :class="group.color">
          <span class="mod-badge__dot" />
          {{ group.name }}
        </span>
        <span class="perm-group__meta">
          {{ checkedCount(group) }} / {{ group.perms.length }}
        </span>
        <svg class="perm-group__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div class="perm-body">
        <label v-for="p in group.perms" :key="p.code" class="perm-check">
          <input
            type="checkbox"
            :value="p.code"
            :checked="modelValue.includes(p.code)"
            @change="toggleCode(p.code)"
          />
          <span class="perm-check__code">{{ p.code }}</span>
          <span class="perm-check__name">{{ p.name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { PERMISSION_GROUPS, type PermissionGroup } from '@/constants/rbac.catalog'

const props = defineProps<{
  /** 当前勾选的权限码集合 */
  modelValue: string[]
  /** 可选：限定展示哪些模块（默认全部） */
  modules?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', codes: string[]): void
}>()

const groups = PERMISSION_GROUPS.filter((g) => !props.modules?.length || props.modules.includes(g.module))
const collapsed = reactive<Record<string, boolean>>({})

function toggle(module: string): void {
  collapsed[module] = !collapsed[module]
}

function checkedCount(group: PermissionGroup): number {
  return group.perms.filter((p) => props.modelValue.includes(p.code)).length
}

function toggleCode(code: string): void {
  const next = new Set(props.modelValue)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  emit('update:modelValue', Array.from(next).sort())
}
</script>
