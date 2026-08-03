<script setup lang="ts">
import BaseSettings from './components/editor/BaseSettings.vue'
import ReplyRules from './components/editor/ReplyRules.vue'
import UrlMatching from './components/editor/UrlMatching.vue'
import MenuSettings from './components/editor/MenuSettings.vue'
import JsonPreview from './components/JsonPreview.vue'

const showSidebar = ref(false)
const appDataManager = useAppDataManager()
const editorStore = useEditorStore()
const appStore = useAppStore()

// 视图模式：edit = 可视化编辑，preview = JSON 源码编辑
const viewMode = ref<'edit' | 'preview'>('edit')
const jsonPreviewRef = ref<InstanceType<typeof JsonPreview> | null>(null)

// 从源码切换到编辑时，自动应用所有脏修改
function switchToEdit() {
  if (jsonPreviewRef.value) {
    const ok = jsonPreviewRef.value.tryApplyAll()
    if (!ok) return // 有 JSON 解析错误，留在源码模式
  }
  viewMode.value = 'edit'
}

function switchToSource() {
  viewMode.value = 'preview'
}

// Toast 消息
const toastMsg = ref('')
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null)
function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer.value) clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => { toastMsg.value = '' }, 2500)
}

// 文件导入

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

    <div class="h-full flex items-center justify-center p-0 pt-8">
      <main class="mac-window md:mb-4 relative z-1 w-full h-full md:w-[70%] min-h-0 rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]">
        <div class="flex w-full h-full bg-[rgba(255,250,244,0.92)] dark:bg-[#1a1c1e]/92 backdrop-blur-md relative">
          <!-- Mac 窗口控制按钮 + 视图切换 -->
          <div class="absolute top-4 left-4 z-10 hidden md:flex items-center gap-3">
            <MacWindowControls
              :show-close="true"
              :show-minimize="true"
              :show-maximize="true"
            />
            <!-- 视图切换 -->
            <div class="flex items-center rounded-md overflow-hidden border border-[rgba(125,77,51,0.15)] dark:border-[rgba(255,255,255,0.08)]">
              <button
                @click="switchToEdit"
                :class="['px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150', viewMode === 'edit' ? 'bg-[#ce8256] text-white' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1]']"
              >
                编辑
              </button>
              <button
                @click="switchToSource"
                :class="['px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150', viewMode === 'preview' ? 'bg-[#ce8256] text-white' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1]']"
              >
                源码
              </button>
            </div>
          </div>

          <!-- 左侧导航 -->
          <nav class="w-55 min-w-55 hidden flex-col gap-0.5 pt-14 px-3 pb-6 md:flex">
            <button
              v-for="tab in [
                { id: 'base' as const, label: '基础设置' },
                { id: 'reply' as const, label: '回复规则' },
                { id: 'url' as const, label: 'URL 匹配' },
                { id: 'menu' as const, label: '菜单设置' }
              ]"
              :key="tab.id"
              @click="editorStore.setActivePage(tab.id)"
              :class="['transition-all duration-180 ease-in-out py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left w-full font-normal', editorStore.activePage === tab.id ? 'bg-[#ce8256] text-[#fff8f2]' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]']"
            >
              {{ tab.label }}
            </button>

          </nav>

          <!-- 右侧内容区 -->
          <div class="flex-1 min-h-0 h-full bg-white dark:bg-[#181a1c] relative flex flex-col">
            <!-- 页面内容 -->
            <div class="flex-1 min-h-0 overflow-auto">
              <div v-if="!appStore.isReady" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-6 h-6 border-2 border-[#ce8256] border-t-transparent rounded-full animate-spin" />
                  <span class="text-sm text-[#8f949a]">加载中...</span>
                </div>
              </div>
              <JsonPreview
                v-else-if="viewMode === 'preview' && appStore.datas"
                ref="jsonPreviewRef"
                :page="editorStore.activePage"
                :datas="appStore.datas"
                @applied="showToast('更改已应用')"
              />
              <component v-else :is="currentPageComponent" />
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div
        v-if="toastMsg"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm shadow-lg bg-[#3d2e2a] text-white dark:bg-[#2a2d30] dark:text-[#e1e3e5]"
      >
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>

<style>
/* VS Code 风格滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
  cursor: default;
}
::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.25);
  border-radius: 4px;
  cursor: default;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.45);
  cursor: default;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
</style>
