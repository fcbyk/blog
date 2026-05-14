<script setup>
const appStore = useAppStore()
const sender = useMessageSender()
const matcher = useMessageMatcher()
const messageStore = useMessageStore()

// 从 store 获取菜单数据
const menu = computed(() => {
  return appStore.datas?.baseConfig.menu || []
})

// 检查菜单项是否有子菜单
const isExpandable = (item) => {
  return 'child' in item && Array.isArray(item.child) && item.child.length > 0
}

// 获取子菜单项
const getChildItems = (item) => {
  if ('child' in item) {
    return item.child || []
  }
  return []
}

// 菜单状态管理
const openIndex = ref(null)

const menuState = {
  isOpen: (index) => openIndex.value === index,
  toggle: (index) => {
    openIndex.value = openIndex.value === index ? null : index
  },
  close: () => {
    openIndex.value = null
  }
}

// 处理菜单项点击
const handleItemClick = async (item, index) => {
  // 如果正在输入中，直接返回，不触发任何操作
  if (messageStore.isTyping) {
    return
  }

  if (isExpandable(item)) {
    menuState.toggle(index)
    return
  }

  // 发送消息并检查自动回复
  if (item.messages && item.messages.length > 0) {
    // 先发送所有消息
    await sender.sendBatch(item.messages)
    
    // 收集并发送自动回复（去重）
    const result = matcher.collectAllReplies(item.messages)
    if (result.matched) {
      await sender.sendBatchAs(result.messages, 'bot')
    }
  }
}

// 处理子菜单点击
const handleChildClick = async (childItem) => {
  // 如果正在输入中，直接返回，不触发任何操作
  if (messageStore.isTyping) {
    return
  }

  menuState.close()
  
  // 发送用户消息
  if (childItem.messages && childItem.messages.length > 0) {
    // 先发送所有消息
    await sender.sendBatch(childItem.messages)
    
    // 收集并发送自动回复（去重）
    const result = matcher.collectAllReplies(childItem.messages)
    if (result.matched) {
      await sender.sendBatchAs(result.messages, 'bot')
    }
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event) => {
  const target = event.target
  if (!target.closest('.action-menu-wrapper')) {
    menuState.close()
  }
}

// 添加全局点击事件监听
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div class="action-menu-wrapper relative w-full select-none">
    <div class="action-menu-container flex w-full h-full text-center relative min-h-12.5">
      <div v-for="(item, index) in menu" :key="index" 
        class="menu-item flex-1 cursor-pointer flex items-center justify-center relative py-3 bg-gray-50 dark:bg-[#1f2123] border-l border-gray-200 dark:border-[#2b2d30] hover:text-gray-900 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]"
        @click.stop="handleItemClick(item, index)"
        :class="{
          'has-child': isExpandable(item),
          'active': menuState.isOpen(index)
        }">
        {{ item.label }}
        <span v-if="isExpandable(item)" class="menu-arrow ml-1 text-xs transition-transform duration-200">▼</span>

        <transition name="slide-up">
          <div v-if="isExpandable(item) && menuState.isOpen(index)" 
            class="sub-menu-container absolute bottom-[110%] max-w-[98%] min-w-[80%] bg-white dark:bg-[#24272a] border border-gray-200 dark:border-[#2f3338] rounded-lg shadow-lg z-10 overflow-hidden"
            style="box-shadow: 0 -4px 12px rgba(0,0,0,0.1);"
            @click.stop>
            <div v-for="(childItem, childIndex) in getChildItems(item)" :key="childIndex" 
              class="sub-menu-item px-3 py-3 text-center cursor-pointer border-b border-gray-200 dark:border-[#343940] hover:text-gray-900 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]"
              @click="handleChildClick(childItem)">
              {{ childItem.label }}
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-item:not(:last-child) {
  border-right: 0;
}

.menu-item.has-child.active {
  color: #1f2937;
}

.dark .menu-item.has-child.active {
  color: #ebedf0;
}

.menu-item.has-child.active .menu-arrow {
  transform: rotate(180deg);
}

.sub-menu-item:last-child {
  border-bottom: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
