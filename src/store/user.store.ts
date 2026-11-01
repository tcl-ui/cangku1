import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PageParams, UserRead } from '@/types'
import { userService } from '@/services/user.service'

/** 用户列表数据状态：分页 + 加载态 + 错误态 */
export const useUserStore = defineStore('user', () => {
  const users = ref<UserRead[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(params: PageParams = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await userService.getUsers({
        page: page.value,
        page_size: pageSize.value,
        ...params,
      })
      users.value = result.items
      total.value = result.total
      page.value = result.page
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function removeUser(id: number): Promise<void> {
    await userService.deleteUser(id)
    await fetchUsers()
  }

  return {
    users,
    total,
    page,
    pageSize,
    loading,
    error,
    fetchUsers,
    removeUser,
  }
})
