<script setup lang="ts">
import BaseSettings from './components/editor/BaseSettings.vue'
import ReplyRules from './components/editor/ReplyRules.vue'
import UrlMatching from './components/editor/UrlMatching.vue'
import MenuSettings from './components/editor/MenuSettings.vue'

const showSidebar = ref(false)
const appDataManager = useAppDataManager()
const editorStore = useEditorStore()
const appStore = useAppStore()

const currentPageComponent = computed(() => {
  switch (editorStore.activePage) {
    case 'base': return BaseSettings
    case 'reply': return ReplyRules
    case 'url': return UrlMatching
    case 'menu': return MenuSettings
    default: return BaseSettings
  }
})

onMounted(() => {
  appDataManager.initDatas()
})
</script>

<template>
  <div class="h-dvh relative overflow-hidden flex flex-col z-10 transition-colors duration-300">
    <MacMenuBar @open-sidebar="showSidebar = true" />
    <MobileSidebar v-model="showSidebar" />

    <div class="h-full flex items-center justify-center p-0 mt-8">
      <main class="mac-window md:mb-4 relative z-1 w-full h-full md:w-[70%] md:h-[95%] rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]">
        <div class="flex w-full h-full bg-[rgba(255,250,244,0.92)] dark:bg-[#1a1c1e]/92 backdrop-blur-md relative">
          <div class="absolute top-4 left-4 z-10 hidden md:block">
            <MacWindowControls
              :show-close="true"
              :show-minimize="true"
              :show-maximize="true"
            />
          </div>

          <nav class="w-55 min-w-55 hidden flex-col gap-0.5 pt-14 px-3 pb-6 md:flex">
            <button
              v-for="tab in [
                { id: 'base' as const, label: '基础设置' },
                { id: 'reply' as const, label: '回复规则' },
                { id: 'url' as const, label: 'URL匹配' },
                { id: 'menu' as const, label: '菜单设置' }
              ]"
              :key="tab.id"
              @click="editorStore.setActivePage(tab.id)"
              :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === tab.id ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div class="flex-1 h-full bg-white dark:bg-[#181a1c] relative">
            <div v-if="!appStore.isReady" class="flex items-center justify-center h-full">
              <div class="flex flex-col items-center gap-3">
                <div class="w-6 h-6 border-2 border-[#ce8256] border-t-transparent rounded-full animate-spin" />
                <span class="text-sm text-[#8f949a]">加载中...</span>
              </div>
            </div>
            <component v-else :is="currentPageComponent" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
