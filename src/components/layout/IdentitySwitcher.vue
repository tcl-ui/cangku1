<template>
  <div v-if="USE_MOCK" class="identity-switch">
    <span class="identity-switch__hint">演示身份</span>
    <div class="seg">
      <button
        v-for="identity in IDENTITIES"
        :key="identity.key"
        type="button"
        class="seg__btn"
        :class="{ active: active === identity.key }"
        :disabled="switching"
        @click="switchTo(identity)"
      >
        {{ identity.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIdentitySwitch, IDENTITIES } from '@/composables/useIdentitySwitch'
import { USE_MOCK } from '@/apis/http'

const { active, switching, switchTo } = useIdentitySwitch()
</script>
