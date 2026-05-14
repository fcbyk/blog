<script setup>
import { formatTime } from '~~/shared/utils/time'
import MessageItem from './Item.vue'
import TextMessage from './Text.vue'
import ImageMessage from './Image.vue'
import HTMLMessage from './HTML.vue'
import FileMessage from './File.vue'
import NavMessage from './Nav.vue'

const messageStore = useMessageStore()
const container = ref(null)

// 消息类型与组件的映射关系
const messageComponents = {
  text: TextMessage,
  image: ImageMessage,
  html: HTMLMessage,
  file: FileMessage,
  nav: NavMessage,
}

// 根据消息类型获取对应的组件
const getMessageComponent = (type) => {
  return messageComponents[type] || TextMessage // 默认返回文本消息组件
}

// 如果与前一条消息时间间隔超过阈值（5分钟），则显示时间
const shouldShowTime = (message, index) => {
  if (!message.time) return false
  if (index === 0) return true
  const prevMessage = messageStore.messages[index - 1]
  if (!prevMessage || !prevMessage.time) return false
  return message.time - prevMessage.time > 300000 // 5分钟 = 300000毫秒
}

// 监听消息变化自动滚动 - 智能滚动
let previousMessageCount = 0
let isAtBottom = true // 标记用户是否在底部
const unreadCount = ref(0) // 未读消息数量

// 检测用户是否在底部
const checkIfAtBottom = () => {
  if (!container.value) return false
  const { scrollTop, scrollHeight, clientHeight } = container.value
  // 允许一定的误差范围（5px）
  return scrollHeight - scrollTop - clientHeight < 5
}

// 监听滚动事件，更新是否在底部的状态
const handleScroll = () => {
  const wasAtBottom = isAtBottom
  isAtBottom = checkIfAtBottom()
  
  // 如果用户滚动到底部，清除未读计数
  if (isAtBottom && !wasAtBottom) {
    unreadCount.value = 0
  }
}

// 滚动到底部
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTo({
        top: container.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
      // 滚动后重新检查是否在底部
      setTimeout(() => {
        isAtBottom = checkIfAtBottom()
        if (isAtBottom) {
          unreadCount.value = 0
        }
      }, smooth ? 300 : 0)
    }
  })
}

watch(
  () => messageStore.messages,
  (newMessages, oldMessages) => {
    // 检查是否有新消息添加
    if (newMessages.length > previousMessageCount) {
      const newMessageIndex = previousMessageCount
      const newMessage = newMessages[newMessageIndex]
      
      // 决定是否滚动：
      // 1. 用户消息：总是滚动，并清除未读计数
      // 2. Bot消息：只有当用户在底部时才滚动
      if (newMessage.role === 'user') {
        // 用户消息：清除未读计数并滚动到底部
        unreadCount.value = 0
        isAtBottom = true // 标记为在底部，确保滚动执行
        scrollToBottom(false) // 使用即时滚动，不用平滑效果
      } else if (isAtBottom) {
        // Bot消息且用户在底部：滚动到底部
        scrollToBottom()
      } else {
        // 用户在上方浏览，bot发送消息，增加未读计数
        unreadCount.value++
      }
    }
    
    // 更新之前的消息数量
    previousMessageCount = newMessages.length
  },
  { deep: true }
)
</script>

<template>
  <div class="message-list-container no-scrollbar flex flex-col h-full gap-4 p-4 overflow-y-auto" ref="container" @scroll="handleScroll">
    <!-- 未读消息提示 -->
    <Transition name="fade">
      <div v-if="unreadCount > 0 && !isAtBottom" 
           class="fixed left-1/2 -translate-x-1/2 z-50 cursor-pointer bottom-20 md:bottom-35"
           @click="scrollToBottom">
        <div class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 animate-bounce">
          <span class="text-sm font-medium">{{ unreadCount }} 条新消息</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </Transition>

    <template v-for="(message, index) in messageStore.messages" :key="message.id || message.time">
      <div class="time-divider text-[#999] dark:text-[#7f8489] text-center text-xs" v-if="shouldShowTime(message, index)">
        {{ formatTime(message.time) }}
      </div>

      <MessageItem :role="message.role">
        <component :is="getMessageComponent(message.type)" :role="message.role" :content="message.content"
          :status="message.status" />
      </MessageItem>
    </template>
  </div>
</template>

<style scoped>
@media (max-width: 600px) {
  .message-list-container {
    padding-top: 5px;
    padding-bottom: 10px;
    padding-left: 8px;
    padding-right: 8px;
  }
}

/* 淡入淡出过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
