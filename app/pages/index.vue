<script setup>
const sender = useMessageSender()
const appStore = useAppStore()
const messageStore = useMessageStore()

// 配置数据就绪后再发送欢迎消息
watch(() => appStore.isReady, (ready) => {
  if (!ready) return
  try {
    const helloMsg = appStore.datas?.baseConfig.helloMsg || []
    if (helloMsg.length > 0 && messageStore.messages.length === 0) {
      sender.sendBatchAs(helloMsg, 'bot')
    }
  } catch (err) {
    console.error('欢迎消息发送失败', err)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex-1 overflow-hidden relative z-10">
    <ChatWindow />
  </div>
</template>
