<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="handleSubmit">
      <h1 class="login-card__title">辰光Agent平台</h1>
      <p class="login-card__sub">企业级 AI Agent 管理平台</p>

      <label class="field">
        <span class="field__label">用户名</span>
        <input v-model="form.username" class="input" autocomplete="username" />
      </label>

      <label class="field">
        <span class="field__label">密码</span>
        <input
          v-model="form.password"
          type="password"
          class="input"
          autocomplete="current-password"
        />
      </label>

      <label class="field">
        <span class="field__label">验证码</span>
        <div class="captcha-row">
          <input v-model="form.captcha_code" class="input" />
          <img
            v-if="captcha.image"
            :src="captcha.image"
            class="captcha-img"
            alt="验证码"
            title="点击刷新"
            @click="loadCaptcha"
          />
        </div>
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>

      <p class="login-card__hint">Mock 账号：admin / admin123</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import type { CaptchaResult } from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({ username: '', password: '', captcha_code: '' })
const captcha = reactive<CaptchaResult>({ key: '', image: '' })
const loading = ref(false)
const error = ref('')

async function loadCaptcha(): Promise<void> {
  const result = await authService.getCaptcha()
  captcha.key = result.key
  captcha.image = result.image
}

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true
  try {
    await auth.login({
      username: form.username,
      password: form.password,
      captcha_key: captcha.key,
      captcha_code: form.captcha_code,
    })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(loadCaptcha)
</script>
