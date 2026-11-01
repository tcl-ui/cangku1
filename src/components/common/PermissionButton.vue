<template>
  <button
    v-if="allowed"
    class="btn"
    :class="variantClass"
    :type="type ?? 'button'"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth.store'

const props = defineProps<{
  permission?: string
  anyOf?: string[]
  variant?: 'primary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
}>()

const emit = defineEmits<{ (e: 'click'): void }>()

const auth = useAuthStore()

/** 按钮级权限控制：无权限时整按钮不渲染 */
const allowed = computed(() => {
  if (props.anyOf && props.anyOf.length) return auth.canAny(props.anyOf)
  if (props.permission) return auth.can(props.permission)
  return true
})

const variantClass = computed(() => `btn-${props.variant ?? 'ghost'}`)
</script>
