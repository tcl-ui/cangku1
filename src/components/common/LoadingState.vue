<template>
  <div class="state-box">
    <span class="spinner" aria-hidden="true" />
    <p class="state-box__text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: '加载中…' })
</script>
