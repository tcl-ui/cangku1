<template>
  <div class="error-page">
    <div class="error-page__glyph">403</div>
    <span class="error-page__tag">403 · FORBIDDEN</span>
    <h1>无权访问</h1>
    <p>
      当前账号没有访问该资源所需的权限。如需继续操作，请联系管理员申请对应权限（例如
      <span class="mono">user:list</span>）。
    </p>
    <div class="error-page__actions">
      <RouterLink class="btn btn-primary" to="/dashboard">返回工作台</RouterLink>
      <button class="btn btn-outline" type="button" @click="switchAccount">切换账号</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth.store";

const router = useRouter();
const auth = useAuthStore();

function switchAccount(): void {
  auth.logout();
  router.push({ name: "login" });
}
</script>
