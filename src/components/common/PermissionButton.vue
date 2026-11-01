<template>
  <button
    v-if="allowed"
    class="btn"
    :class="variantClass"
    :type="type ?? 'button'"
    :sm="sm"
    @click="emit('click')"
  >
    <slot />
  </button>
  <button v-else-if="fallback" class="btn btn-disabled" type="button" disabled>
    <slot name="fallback" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/store/auth.store";

const props = defineProps<{
  /** 单个权限码 */
  permission?: string;
  /** 任一满足即可（ANY 语义） */
  anyOf?: string[];
  /** 全部满足才可（AND 语义） */
  allOf?: string[];
  /** 无权限时渲染替代内容（如禁用态按钮），否则不渲染 */
  fallback?: boolean;
  variant?: "primary" | "violet" | "danger" | "outline" | "ghost";
  sm?: boolean;
  type?: "button" | "submit";
}>();

const emit = defineEmits<{ (e: "click"): void }>();
const auth = useAuthStore();

/** 按钮级权限控制（对齐原型 data-perm 门控 + V2 §6.5 Can 语义） */
const allowed = computed(() => {
  if (props.anyOf && props.anyOf.length) return auth.canAny(props.anyOf);
  if (props.allOf && props.allOf.length) return auth.canAll(props.allOf);
  if (props.permission) return auth.can(props.permission);
  return true;
});

const variantClass = computed(() => [
  `btn-${props.variant ?? "ghost"}`,
  props.sm ? "btn-sm" : null,
]);
</script>
