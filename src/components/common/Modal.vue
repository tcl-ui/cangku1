<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay overlay--open" @click.self="emit('close')">
      <div class="modal" :class="{ 'modal--wide': wide }">
        <div class="modal__head">
          <h3 class="modal__title">{{ title }}</h3>
          <button class="modal__close" type="button" aria-label="关闭" @click="emit('close')">
            ×
          </button>
        </div>
        <div class="modal__body">
          <slot />
        </div>
        <div class="modal__foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  wide?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:modelValue', value: boolean): void
}>()
</script>
