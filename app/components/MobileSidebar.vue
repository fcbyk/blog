<script setup lang="ts">
import type { EditorPage } from '~~/shared/types'

// 使用 v-model 双向绑定控制侧边栏显示
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const editorStore = useEditorStore()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// 检查是否已验证管理员权限
const isAdminVerified = computed(() => {
  const isVerified = useCookie('admin-verified', {
    maxAge: 60 * 30,
    sameSite: 'strict'
  })
  return !!isVerified.value
})

// 关闭侧边栏
const handleClose = () => {
  emit('update:modelValue', false)
}



// 处理导航到编辑器页面
const handleNavigateToPage = (page: EditorPage) => {
  // 设置当前页面
  editorStore.setActivePage(page)
  // 关闭侧边栏
  handleClose()
  // 如果当前不在编辑器页面，则跳转
  const route = useRoute()
  if (route.path !== '/editor') {
    navigateTo('/editor')
  }
}



// 处理退出登录
const handleLogout = () => {
  // 清除验证 cookie
  const verifiedCookie = useCookie('admin-verified', {
    maxAge: 60 * 30,
    sameSite: 'strict'
  })
  verifiedCookie.value = null
  
  // 关闭侧边栏并跳转到首页
  handleClose()
  navigateTo('/')
}

// 切换主题（日间/夜间）
const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <!-- 遮罩层 -->
  <Transition name="fade">
    <div 
      v-if="modelValue" 
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-60 md:hidden"
      @click="handleClose"
    />
  </Transition>

  <!-- 侧边栏 -->
  <Transition name="slide">
    <aside 
      v-if="modelValue"
      class="fixed top-0 left-0 h-full w-64 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl z-70 shadow-lg md:hidden flex flex-col text-gray-800 dark:text-[#ebedf0]"
    >
      <!-- 侧边栏头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2b2d30]">
        <div class="flex items-center space-x-2">
          <img src="/favicon.svg" alt="Logo" class="w-5 h-5" />
          <span class="font-medium">非常不愉快</span>
        </div>
        <!-- 主题切换按钮 -->
        <button 
          @click="toggleTheme"
          class="p-1 hover:bg-gray-100 dark:hover:bg-[#2f3237] rounded transition-colors"
          :title="isDark ? '切换到日间模式' : '切换到夜间模式'"
        >
          <!-- 太阳图标（日间模式） -->
          <IconSun v-if="!isDark" />
          <!-- 月亮图标（夜间模式） -->
          <IconMoon v-else />
        </button>
      </div>

      <!-- 侧边栏菜单内容 -->
      <nav class="flex-1 overflow-y-auto py-4">
        <div class="px-4 space-y-2">
          <NuxtLink 
            to="/" 
            class="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors text-gray-700 dark:text-[#c7cbd1]"
            @click="handleClose"
          >
            <IconHome />
            <span>Q&A</span>
          </NuxtLink>

          <!-- 登录后显示编辑器页面切换 -->
          <template v-if="isAdminVerified">
            <!-- 分隔线 -->
            <div class="border-t border-gray-200 dark:border-[#2b2d30] my-2"></div>

            <div class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-[#8f949a] uppercase tracking-wider">
              编辑器页面
            </div>

            <button 
              @click="handleNavigateToPage('base')"
              :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'base' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
            >
              <IconSettings />
              <span>基础设置</span>
            </button>

            <button 
              @click="handleNavigateToPage('reply')"
              :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'reply' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
            >
              <IconMessage />
              <span>回复规则</span>
            </button>

            <button 
              @click="handleNavigateToPage('url')"
              :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'url' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
            >
              <IconLink />
              <span>URL匹配</span>
            </button>

            <button 
              @click="handleNavigateToPage('menu')"
              :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'menu' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
            >
              <IconList />
              <span>菜单设置</span>
            </button>
          </template>

          <!-- 分隔线 -->
          <div class="border-t border-gray-200 dark:border-[#2b2d30] my-2"></div>

          <!-- 退出登录按钮 - 仅管理员可见 -->
          <button 
            v-if="isAdminVerified"
            @click="handleLogout"
            class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-[#2f3237] hover:text-red-600 dark:hover:text-[#ff7f7f] transition-colors text-gray-700 dark:text-[#c7cbd1] text-left"
          >
            <IconLogout />
            <span>退出登录</span>
          </button>
        </div>
      </nav>

      <!-- 侧边栏底部 -->
      <div class="p-4 border-t border-gray-200 dark:border-[#2b2d30]">
        <div class="text-xs text-gray-500 dark:text-[#8f949a] text-center">
          © 2026 非常不愉快
        </div>
      </div>
    </aside>
  </Transition>


</template>

<style scoped>
/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滑入滑出动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
