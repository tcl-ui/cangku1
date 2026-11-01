<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="sidebar__brand-mark" aria-hidden="true" />
        辰光Agent
      </div>
      <SidebarNav />
      <div v-if="auth.user" class="sidebar__user">
        <span class="sidebar__avatar">{{ auth.user.username.charAt(0).toUpperCase() }}</span>
        <div class="sidebar__meta">
          <div class="sidebar__name">{{ auth.user.username }}</div>
          <div class="sidebar__email">{{ auth.user.email }}</div>
        </div>
        <button class="sidebar__logout" type="button" @click="handleLogout">退出</button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar__breadcrumb">
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
            <span v-if="i > 0" class="sep">/</span>
            <RouterLink v-if="i < breadcrumbs.length - 1" :to="crumb.path">{{ crumb.title }}</RouterLink>
            <span v-else class="cur">{{ crumb.title }}</span>
          </template>
        </div>
        <div class="topbar__spacer" />
        <IdentitySwitcher />
      </header>

      <main class="content">
        <div class="page">
          <RouterView />
        </div>
      </main>
    </div>

    <ToastStack />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth.store'
import SidebarNav from './SidebarNav.vue'
import IdentitySwitcher from './IdentitySwitcher.vue'
import ToastStack from '@/components/common/ToastStack.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((r) => r.meta.title)
  return matched.map((r) => ({
    path: r.path,
    title: String(r.meta.title ?? ''),
  }))
})

function handleLogout(): void {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
