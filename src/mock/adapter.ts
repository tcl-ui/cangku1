import type { AxiosAdapter, AxiosResponse } from 'axios'
import { handleMockRequest } from './handlers'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 自定义 axios adapter：用本地 mock 数据响应，不发起真实网络请求。
 * 返回结构与真实 axios 响应一致，后续拦截器（解包/鉴权）可无感复用。
 */
export function createMockAdapter(): AxiosAdapter {
  return async (config) => {
    await sleep(120) // 模拟网络延迟
    const response: AxiosResponse = {
      data: handleMockRequest(config),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
    return response
  }
}
