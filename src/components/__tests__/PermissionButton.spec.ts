import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PermissionButton from '@/components/common/PermissionButton.vue'
import { useAuthStore } from '@/store/auth.store'
import type { CurrentUser } from '@/types'

function setUser(permissions: string[]): void {
  const user: CurrentUser = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    is_active: true,
    is_superuser: false,
    roles: ['ops'],
    permissions,
  }
  useAuthStore().user = user
}

describe('PermissionButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('具备权限时渲染按钮', () => {
    setUser(['user:delete'])
    const wrapper = mount(PermissionButton, {
      props: { permission: 'user:delete' },
      slots: { default: '删除' },
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('删除')
  })

  it('缺少权限时不渲染按钮', () => {
    setUser([])
    const wrapper = mount(PermissionButton, {
      props: { permission: 'user:delete' },
      slots: { default: '删除' },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('未指定权限时默认可见', () => {
    setUser([])
    const wrapper = mount(PermissionButton, {
      slots: { default: '查看' },
    })

    expect(wrapper.find('button').exists()).toBe(true)
  })
})
