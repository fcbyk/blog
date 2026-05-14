import type { Message, MessageList } from "~~/shared/types/message"

export const useMessageStore = defineStore("message", () => {
  // 状态
  const messages = ref<MessageList>([])
  const isTyping = ref(false)

  function addMessage(msg: Message) {
    messages.value.push(msg)
  }

  function updateMessageStatus(id: string, status: "loading" | "completed") {
    const item = messages.value.find(msg => msg.id === id)
    if (item) {
      item.status = status
    }
  }

  function setTyping(status: boolean) {
    isTyping.value = status
  }

  function clearMessages() {
    messages.value = []
  }

  return {
    messages,
    isTyping,
    addMessage,
    updateMessageStatus,
    setTyping,
    clearMessages,
  }
})
