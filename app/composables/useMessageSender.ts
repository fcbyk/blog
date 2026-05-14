import type {
  MessageConfig,
  MessageConfigWithRole,
  MessageRole,
  MessageType,
  Message
} from '~~/shared/types/message'
import { calculateLoadingTime, sleep } from '~~/shared/utils/time'

export function useMessageSender() {
  const messageStore = useMessageStore()
  const createMessageId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  // 发送单条消息（核心逻辑）
  const sendSingleMessage = async (
    role: MessageRole,
    content: any,
    loadingTime: number | undefined,
    type: MessageType = "text"
  ) => {
    // 计算加载时间
    let actualLoadingTime = loadingTime ?? 0
    if (loadingTime === undefined) {
      if (role === "bot") {
        actualLoadingTime =
          type === "text" && typeof content === "string"
            ? calculateLoadingTime(content)
            : 500 + Math.random() * 500
      }
    }

    const msg: Message = {
      id: createMessageId(),
      role,
      type,
      content,
      time: Date.now(),
      status: "loading",
      loadingTime: actualLoadingTime
    }

    messageStore.addMessage(msg)

    if (actualLoadingTime > 0) await sleep(actualLoadingTime)

    messageStore.updateMessageStatus(msg.id, "completed")
  }

  // 发送消息（通用方法）
  const send = async (message: MessageConfigWithRole) => {
    const isBot = message.role === "bot"
    if (isBot) messageStore.setTyping(true)

    try {
      await sendSingleMessage(
        message.role,
        message.content,
        message.loadingTime,
        message.type
      )
    } finally {
      if (isBot) messageStore.setTyping(false)
    }
  }

  // 以用户身份发送消息
  const sendAsUser = async (message: MessageConfig) => {
    await sendSingleMessage(
      "user",
      message.content,
      message.loadingTime,
      message.type
    )
  }

  // 以机器人身份发送消息
  const sendAsBot = async (message: MessageConfig) => {
    messageStore.setTyping(true)
    try {
      await sendSingleMessage(
        "bot",
        message.content,
        message.loadingTime,
        message.type
      )
    } finally {
      messageStore.setTyping(false)
    }
  }

  // 批量发送消息（按顺序）
  const sendBatch = async (messages: MessageConfigWithRole[]) => {
    const needTyping = messages.some(m => m.role === "bot")
    if (needTyping) messageStore.setTyping(true)

    try {
      for (const msg of messages) await send(msg)
    } finally {
      if (needTyping) messageStore.setTyping(false)
    }
  }

  // 批量角色发送
  const sendBatchAs = async (
    messages: MessageConfig[],
    role: MessageRole = "bot"
  ) => {
    const needTyping = role === "bot"
    if (needTyping) messageStore.setTyping(true)

    try {
      for (const msg of messages) {
        await sendSingleMessage(role, msg.content, msg.loadingTime, msg.type)
      }
    } finally {
      if (needTyping) messageStore.setTyping(false)
    }
  }

  return {
    send,
    sendAsUser,
    sendAsBot,
    sendBatch,
    sendBatchAs
  }
}
