<script setup>
const sender = useMessageSender()
const appStore = useAppStore()
const messageStore = useMessageStore()

onMounted(async () => {
  try {
    const helloMsg = appStore.datas?.baseConfig.helloMsg || []
    if (helloMsg.length > 0 && messageStore.messages.length === 0) {
      await sender.sendBatchAs(helloMsg, 'bot')
    }
  } catch (err) {
    console.error('欢迎消息发送失败', err)
  }
})
</script>

<template>
  <div class="flex-1 overflow-hidden relative z-10">
    <ChatWindow />
  </div>
</template>
