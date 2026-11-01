<template>
  <div class="toast-stack" aria-live="polite">
    <div
      v-for="t in toastStore.toasts"
      :key="t.id"
      class="toast toast--show"
      :class="`toast--${t.tone}`"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/store/toast.store'

const toastStore = useToastStore()
</script>
