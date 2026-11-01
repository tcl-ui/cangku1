import axios, {
  AxiosError,
  AxiosResponse,
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

/** 携带业务错误码的请求错误（code 为后端返回的业务码，如 401/403/404） */
export class ApiError extends Error {
  code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 解包后端 { code, message, data } 信封；非 200 抛出 ApiError */
export function unwrapEnvelope<T>(response: AxiosResponse<unknown>): T {
  const body = (response.data ?? {}) as Partial<ApiResponse<T>>

  // 若响应体不是信封结构（如直接返回数据），原样返回
  if (body.code === undefined && body.data === undefined) {
    return response.data as T
  }

  if (body.code !== 200) {
    const message = body.message ?? '请求失败'
    // 401：token 失效，清除并跳转登录页。
    if (body.code === 401) {
      tokenStorage.remove()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    throw new ApiError(message, body.code ?? 500)
  }

  return body.data as T
}

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

// 响应拦截：成功时解包信封并返回业务数据（与 http.get<T, T> 的 R 泛型对齐）；
// 错误时归一化为 ApiError。
http.interceptors.response.use(
  (response) => unwrapEnvelope(response) as unknown as AxiosResponse,
  (error: AxiosError<{ code?: number; message?: string }>) => {
    if (error.response) {
      const body = error.response.data
      const code = body?.code ?? error.response.status
      return Promise.reject(new ApiError(body?.message ?? error.message, code))
    }
    return Promise.reject(new ApiError(error.message, 0))
  },
)
