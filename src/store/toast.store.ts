import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'success' | 'danger' | 'info' | 'violet'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

/** 全局 toast：按钮级操作结果反馈（如「无权限」提示） */
export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])
  let nextId = 1

  function toast(message: string, tone: ToastTone = 'info'): void {
    const id = nextId++
    toasts.value.push({ id, message, tone })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 2200)
  }

  return { toasts, toast }
})
