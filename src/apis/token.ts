const TOKEN_KEY = 'chenguang_token'

/** 前端 token 存储（统一读写入口，避免各处直接操作 localStorage） */
export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },
  remove(): void {
    localStorage.removeItem(TOKEN_KEY)
  },
}
