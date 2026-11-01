import { describe, expect, it } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { handleMockRequest } from '@/mock/handlers'
import type { ApiResponse, PageResult, TokenResponse, UserRead } from '@/types'

function makeConfig(opts: {
  method: string
  url: string
  params?: Record<string, unknown>
  data?: unknown
  token?: string
}): InternalAxiosRequestConfig {
  const headers = {
    get: (name: string) =>
      name === 'Authorization' && opts.token ? `Bearer ${opts.token}` : null,
  }
  return {
    method: opts.method,
    url: opts.url,
    params: opts.params,
    data: opts.data,
    headers,
  } as unknown as InternalAxiosRequestConfig
}

describe('mock handlers', () => {
  it('登录成功返回 token 与当前用户', () => {
    const res = handleMockRequest(
      makeConfig({
        method: 'post',
        url: '/api/v1/auth/login',
        data: JSON.stringify({ username: 'admin', password: 'admin123' }),
      }),
    ) as ApiResponse<TokenResponse>

    expect(res.code).toBe(200)
    expect(res.data?.access_token).toBe('admin')
    expect(res.data?.user.is_superuser).toBe(true)
  })

  it('密码错误返回业务码 401', () => {
    const res = handleMockRequest(
      makeConfig({
        method: 'post',
        url: '/api/v1/auth/login',
        data: JSON.stringify({ username: 'admin', password: 'wrong' }),
      }),
    ) as ApiResponse<null>

    expect(res.code).toBe(401)
    expect(res.data).toBeNull()
  })

  it('分页搜索用户返回 items 与 total', () => {
    const res = handleMockRequest(
      makeConfig({
        method: 'get',
        url: '/api/v1/users/search',
        params: { page: 1, page_size: 3 },
      }),
    ) as ApiResponse<PageResult<UserRead>>

    expect(res.data?.items).toHaveLength(3)
    expect(res.data?.total).toBeGreaterThan(0)
    expect(res.data?.page_size).toBe(3)
  })

  it('关键词搜索过滤结果', () => {
    const res = handleMockRequest(
      makeConfig({
        method: 'get',
        url: '/api/v1/users/search',
        params: { page: 1, page_size: 20, keyword: 'admin' },
      }),
    ) as ApiResponse<PageResult<UserRead>>

    expect(res.data?.total).toBe(1)
    expect(res.data?.items[0]?.username).toBe('admin')
  })

  it('未携带 token 访问 /users/me 返回 401', () => {
    const res = handleMockRequest(
      makeConfig({ method: 'get', url: '/api/v1/users/me' }),
    ) as ApiResponse<null>

    expect(res.code).toBe(401)
  })

  it('携带 token 访问 /users/me 返回当前用户', () => {
    const res = handleMockRequest(
      makeConfig({ method: 'get', url: '/api/v1/users/me', token: 'admin' }),
    ) as ApiResponse<UserRead & { permissions?: string[] }>

    expect(res.code).toBe(200)
    expect(res.data?.username).toBe('admin')
  })
})
