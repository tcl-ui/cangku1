import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiResponse } from '@/types'
import { tokenStorage } from './token'
import { createMockAdapter } from '@/mock'

/** 后端基础地址（Mock 模式下不发起真实网络请求） */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

/** 是否启用 Mock（默认 true，便于无后端开发调试） */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** axios 实例：统一 baseURL、超时、请求头 */
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Mock 模式：替换底层 adapter，请求直接由本地 mock 数据响应。
if (USE_MOCK) {
  http.defaults.adapter = createMockAdapter()
}

// 请求拦截：自动注入 JWT token。
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// 响应拦截：统一解包 { code, message, data }；非 200 抛业务错误。
http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown> | unknown

    if (
      body &&
      typeof body === 'object' &&
      'code' in body &&
      'message' in body &&
      'data' in body
    ) {
      const envelope = body as ApiResponse<unknown>

      if (envelope.code !== 200) {
        const error = new Error(envelope.message || '请求失败') as Error & {
          code?: number
        }
        error.code = envelope.code

        // 401：token 失效，清除并跳转登录页。
        if (envelope.code === 401) {
          tokenStorage.remove()
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
        }

        return Promise.reject(error)
      }

      response.data = envelope.data
    }

    return response
  },
  (error) => Promise.reject(error),
)
