<script setup lang="ts">
import BaseSettings from '~/components/editor/BaseSettings.vue'
import ReplyRules from '~/components/editor/ReplyRules.vue'
import UrlMatching from '~/components/editor/UrlMatching.vue'
import MenuSettings from '~/components/editor/MenuSettings.vue'

const editorStore = useEditorStore()

// 处理关闭窗口，返回首页
function handleClose() {
  // 重置页面状态
  editorStore.resetPage()
  navigateTo('/')
}

// 根据 activePage 计算当前应该显示的组件
const currentPageComponent = computed(() => {
  switch (editorStore.activePage) {
    case 'base':
      return BaseSettings
    case 'reply':
      return ReplyRules
    case 'url':
      return UrlMatching
    case 'menu':
      return MenuSettings
    default:
      return BaseSettings
  }
})
</script>

<template>
  <div class="h-full flex items-center justify-center p-0 mt-8">
    <!-- macOS 风格窗口 -->
    <main class="mac-window md:mb-4 relative z-1 w-full h-full md:w-[70%] md:h-[95%] rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]">
      <div class="flex w-full h-full bg-[rgba(255,250,244,0.92)] dark:bg-[#1a1c1e]/[0.92] backdrop-blur-md relative">
        <!-- macOS 风格窗口控制按钮 - 在移动端隐藏 -->
        <div class="absolute top-4 left-4 z-10 hidden md:block">
          <MacWindowControls 
            :show-close="true"
            :show-minimize="true"
            :show-maximize="true"
            :clickable="true"
            @close="handleClose"
          />
        </div>

        <!-- 左侧导航栏 - 在移动端隐藏 -->
        <nav class="w-55 min-w-55 hidden flex-col gap-0.5 pt-14 px-3 pb-6 md:flex">
          <button
            @click="editorStore.setActivePage('base')"
            :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === 'base' ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
          >
            基础设置
          </button>
          <button
            @click="editorStore.setActivePage('reply')"
            :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === 'reply' ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
          >
            回复规则
          </button>
          <button
            @click="editorStore.setActivePage('url')"
            :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === 'url' ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
          >
            URL匹配
          </button>
          <button
            @click="editorStore.setActivePage('menu')"
            :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === 'menu' ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
          >
            菜单设置
          </button>
        </nav>

        <!-- 右侧内容区域 -->
        <div class="flex-1 h-full bg-white dark:bg-[#181a1c] relative">
          <component :is="currentPageComponent" />
        </div>
      </div>
    </main>
  </div>
</template>
