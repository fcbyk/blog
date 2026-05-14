<script setup lang="ts">
const route = useRoute()
const appStore = useAppStore()
const sender = useMessageSender()
const matcher = useMessageMatcher()

onMounted(async () => {
  try {
    const triggerPath = Array.isArray(route.params.path)
      ? route.params.path[0]
      : route.params.path

    if (!triggerPath) {
      await navigateTo('/', { replace: true })
      return
    }
    
    // 查找匹配的 URL 触发器（直接使用 path 作为 key）
    const urlTriggers = appStore.datas?.urlTriggers || {}
    const matchedMessages = urlTriggers[triggerPath]
    
    if (matchedMessages && matchedMessages.length > 0) {
      // 发送触发的消息
      await sender.sendBatch(matchedMessages)
      
      // 收集并发送自动回复（去重）
      const result = matcher.collectAllReplies(matchedMessages)
      if (result.matched) {
        await sender.sendBatchAs(result.messages, 'bot')
      }
    } else {
      await navigateTo('/', { replace: true })
    }
  } catch (error) {
    console.error('处理 URL 触发器出错:', error)
    await navigateTo('/', { replace: true })
  }
})
</script>

<template>
  <div class="flex-1 overflow-hidden relative z-10">
    <ChatWindow />
  </div>
</template>
