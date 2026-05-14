<script setup lang="ts">
const appStore = useAppStore()
const currentMode = ref('menu')
const message = ref('')
const isAnimating = ref(false)

// 计算是否有菜单配置（从 store 获取）
const hasActionMenu = computed(() => {
  const menu = appStore.datas?.baseConfig.menu
  return menu && menu.length > 0
})

const toggleMode = async () => {
  // 如果没有菜单配置，不允许切换
  if (!hasActionMenu.value) return
  
  isAnimating.value = true
  await new Promise(resolve => setTimeout(resolve, 300)) // 等待下滑动画完成
  currentMode.value = currentMode.value === 'text' ? 'menu' : 'text'
  isAnimating.value = false
}

// 组件挂载时初始化模式
onMounted(() => {
  // 如果有菜单配置，默认显示菜单模式；否则显示输入框模式
  if (hasActionMenu.value) {
    currentMode.value = 'menu'
  } else {
    currentMode.value = 'text'
  }
})

// 监听菜单配置变化，动态调整默认模式
watch(hasActionMenu, (newValue) => {
  // 只有当当前模式是 text 且有菜单时，才切换到 menu 模式
  // 避免用户手动切换到 text 后被强制切回 menu
  if (newValue && currentMode.value === 'text') {
    currentMode.value = 'menu'
  }
})
</script>

<template>
  <Transition name="slide-root" mode="out-in">
    <div 
      class="chat-container border-t border-gray-200 dark:border-[#2b2d30] flex bg-gray-50 dark:bg-[#1f2123]"
      :key="currentMode"
    >
      <!-- 切换按钮 -->
      <div class="flex items-end p-2 pb-2">
        <button 
          @click="toggleMode" 
          class="rounded-full p-1 transition-colors flex items-center justify-center w-8 h-8 relative group"
          :class="{
            'hover:bg-gray-200 dark:hover:bg-[#2f3237]': hasActionMenu,
            'opacity-50 cursor-not-allowed': !hasActionMenu
          }" 
          :disabled="!hasActionMenu || isAnimating"
          :title="!hasActionMenu ? '无菜单数据' : (currentMode === 'text' ? '切换到菜单模式' : '切换到输入模式')"
        >
          <IconMenu v-if="currentMode === 'text'" />
          <IconChat v-else />
        </button>
      </div>

      <div class="flex-1">
        <BottomMenu v-if="currentMode === 'menu'" />
        <BottomInput v-else v-model="message" />
      </div>
    </div>
  </Transition>
  <div class="h-4 bg-gray-50 dark:bg-[#1f2123] md:hidden"></div>
</template>

<style scoped>
/* 根组件滑动动画 */
.slide-root-enter-active,
.slide-root-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-root-enter-from,
.slide-root-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.slide-root-enter-to,
.slide-root-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
