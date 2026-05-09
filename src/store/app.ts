import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const count = ref(0)
  const message = ref('Hello from Pinia!')

  // 方法
  function increment() {
    count.value++
  }

  function setMessage(newMessage) {
    message.value = newMessage
  }

  return {
    count,
    message,
    increment,
    setMessage
  }
})
