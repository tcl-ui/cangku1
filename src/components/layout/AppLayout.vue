<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar__brand">辰光Agent</div>
      <SidebarNav />
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar__spacer" />
        <div v-if="auth.user" class="topbar__user">
          <span class="topbar__name">{{ auth.user.username }}</span>
          <button class="btn btn-ghost" type="button" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth.store'
import SidebarNav from './SidebarNav.vue'

const router = useRouter()
const auth = useAuthStore()

function handleLogout(): void {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
