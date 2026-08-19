<script setup lang="ts">
import BaseSettings from '~/components/editor/BaseSettings.vue'
import ReplyRules from '~/components/editor/ReplyRules.vue'
import UrlMatching from '~/components/editor/UrlMatching.vue'
import MenuSettings from '~/components/editor/MenuSettings.vue'
import JsonPreview from '~/components/editor/JsonPreview.vue'
import { DEFAULT_CONFIG } from '~~/shared/defaultConfig'

const { isLoggedIn, isChecking, checkAuth } = useAuth()

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) {
    navigateTo('/')
  }
})

const editorStore = useEditorStore()
const editorDataManager = useEditorDataManager()

const EDITOR_STORAGE_KEY = 'editor-saved-data'

// 深拷贝工具
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// 默认初始化为空数据（优先从 localStorage 恢复）
// 在 setup 顶层同步执行，确保子组件 mount 前 editorDatas 已就绪
// （子组件 onMounted 早于父组件 onMounted，若在此处用 onMounted 初始化，子组件会读到空数据，导致刷新后默认页不渲染）
if (!editorStore.editorDatas) {
  try {
    const saved = localStorage.getItem(EDITOR_STORAGE_KEY)
    if (saved) {
      editorStore.setDatas(JSON.parse(saved))
    } else {
      editorStore.setDatas(deepClone(DEFAULT_CONFIG))
    }
  } catch {
    editorStore.setDatas(deepClone(DEFAULT_CONFIG))
  }
}

// 自动持久化：数据变化时存入 localStorage
watch(() => editorStore.editorDatas, (data) => {
  if (data) {
    try { localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(data)) } catch {}
  }
}, { deep: true })

// 导入/清空数据会替换整个 editorDatas 引用，递增 refreshKey 强制当前编辑组件 remount，
// 使其 onMounted 重新执行 fetchConfig 拉取最新数据（编辑过程中的深层修改不替换引用，不会误触发）
const refreshKey = ref(0)
watch(() => editorStore.editorDatas, () => {
  refreshKey.value++
})

// 清空/导出已移至 MacMenuBar 下拉菜单，通过 editorStore 调用

// ─── 视图模式 ───
const viewMode = ref<'edit' | 'preview'>('edit')
const jsonPreviewRef = ref<InstanceType<typeof JsonPreview> | null>(null)

function switchToEdit() {
  if (jsonPreviewRef.value) {
    const ok = jsonPreviewRef.value.tryApplyAll()
    if (!ok) return
  }
  viewMode.value = 'edit'
}
function switchToSource() { viewMode.value = 'preview' }

// ─── Toast ───
const toastMsg = ref('')
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null)
function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer.value) clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => { toastMsg.value = '' }, 2500)
}

// ─── 关闭 ───
function handleClose() {
  editorStore.resetPage()
  navigateTo('/')
}

// ─── 数据源弹窗 ───
const sourceType = ref<'local' | 'github' | null>(null)

// ─── 本站数据（确认后直接加载） ───
const localLoading = ref(false)

function openLocalSource() {
  sourceType.value = 'local'
}

async function loadLocalData() {
  localLoading.value = true
  try {
    const data = editorDataManager.loadFromApp()
    if (data) {
      editorStore.setDatas(data)
      closeSourcePopup()
      showToast('已加载本站数据')
    } else {
      showToast('暂无数据，请先访问首页加载配置')
    }
  } catch {
    showToast('加载失败')
  } finally {
    localLoading.value = false
  }
}

// ─── GitHub 数据 ───
const githubUrl = ref('https://raw.githubusercontent.com/GitHub昵称/仓库/分支/')
const githubLoading = ref(false)
const githubError = ref('')

function openGithubSource() {
  sourceType.value = 'github'
  githubUrl.value = 'https://raw.githubusercontent.com/GitHub昵称/仓库/分支/'
  githubError.value = ''
  setTimeout(() => {
    const input = document.querySelector<HTMLInputElement>('#github-url-input')
    input?.focus()
  }, 100)
}

async function loadGithubData() {
  const base = githubUrl.value.trim()
  if (!base) {
    githubError.value = '请输入 GitHub Raw 地址'
    return
  }
  const rawBase = base.endsWith('/') ? base : base + '/'
  githubLoading.value = true
  githubError.value = ''
  try {
    const [baseRes, keywordRes, regexRes, urlRes] = await Promise.all([
      $fetch<string>('/api/proxy/raw', { query: { url: rawBase + 'chat/base.json' } }),
      $fetch<string>('/api/proxy/raw', { query: { url: rawBase + 'chat/keyword.json' } }),
      $fetch<string>('/api/proxy/raw', { query: { url: rawBase + 'chat/regex.json' } }),
      $fetch<string>('/api/proxy/raw', { query: { url: rawBase + 'chat/url.json' } }),
    ])

    editorStore.setDatas({
      baseConfig: JSON.parse(baseRes),
      keywordReplies: JSON.parse(keywordRes),
      regexReplies: JSON.parse(regexRes),
      urlTriggers: JSON.parse(urlRes),
    })
    githubUrl.value = 'https://raw.githubusercontent.com/GitHub昵称/仓库/分支/'
    closeSourcePopup()
    showToast('已加载 GitHub 数据')
  } catch (err: any) {
    githubError.value = '加载失败：' + (err?.message || '请检查地址是否正确')
  } finally {
    githubLoading.value = false
  }
}

// ─── 关闭弹窗 ───
function closeSourcePopup() {
  editorStore.closeImportPopup()
  sourceType.value = null
}

const currentPageComponent = computed(() => {
  switch (editorStore.activePage) {
    case 'base': return BaseSettings
    case 'reply': return ReplyRules
    case 'url': return UrlMatching
    case 'menu': return MenuSettings
    default: return BaseSettings
  }
})

// 切换视图/页面时重置滚动位置
const scrollContainerRef = ref<HTMLElement | null>(null)
watch([viewMode, () => editorStore.activePage], () => {
  nextTick(() => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = 0
    }
  })
})
</script>

<template>
  <div v-if="isChecking" class="h-full flex items-center justify-center">
    <div class="flex items-center gap-2 text-[#7a5a48] dark:text-gray-400">
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="text-sm">检查登录状态...</span>
    </div>
  </div>
  <div v-else-if="isLoggedIn" class="h-full flex items-center justify-center p-0 pt-8">
    <main class="mac-window md:mb-4 relative z-1 w-full h-full md:w-[70%] md:h-[90%] min-h-0 rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]">
      <div class="flex w-full h-full bg-[rgba(255,250,244,0.92)] dark:bg-[#1a1c1e]/92 backdrop-blur-md relative">
        <!-- 窗口控制 + 视图切换 -->
        <div class="absolute top-4 left-4 z-10 hidden md:flex items-center gap-3">
          <MacWindowControls
            :show-close="true" :show-minimize="true" :show-maximize="true"
            :clickable="true" @close="handleClose"
          />
          <div v-if="editorStore.editorDatas" class="flex items-center rounded-md overflow-hidden border border-[rgba(125,77,51,0.15)] dark:border-[rgba(255,255,255,0.08)]">
            <button @click="switchToEdit" :class="['px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150', viewMode === 'edit' ? 'bg-[#ce8256] text-white' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1]']">编辑</button>
            <button @click="switchToSource" :class="['px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150', viewMode === 'preview' ? 'bg-[#ce8256] text-white' : 'bg-transparent text-[#6f4c39] dark:text-[#c7cbd1]']">源码</button>
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
        <div class="flex-1 h-full bg-white dark:bg-[#181a1c] relative">
          <JsonPreview
            v-if="viewMode === 'preview'"
            ref="jsonPreviewRef"
            :page="editorStore.activePage"
            :datas="editorStore.editorDatas!"
            @applied="showToast('更改已应用')"
          />
          <component v-else :is="currentPageComponent" :key="refreshKey" />
        </div>
      </div>
    </main>

    <!-- 数据源弹窗 -->
    <Teleport to="body">
      <div v-if="editorStore.showImportPopup" class="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
        <div class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
          <!-- 标题栏 -->
          <div class="flex justify-between items-center p-4 px-5 border-b border-[#f0e6dd] dark:border-[#2b2d30]">
            <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" @close="closeSourcePopup" />
            <h3 class="text-base text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">导入数据</h3>
            <div class="w-8"></div>
          </div>

          <div class="p-5">
            <!-- 未选择类型 → 两个按钮 -->
            <template v-if="!sourceType">
              <button
                @click="openLocalSource"
                class="w-full py-3.5 px-4 mb-3 rounded-xl border-2 border-[rgba(125,77,51,0.15)] dark:border-[rgba(255,255,255,0.08)] bg-[#fafaf7] dark:bg-[#1f2123] text-left cursor-pointer transition-all duration-200 hover:border-[#ce8256] hover:bg-[rgba(206,130,86,0.04)]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[rgba(206,130,86,0.12)] flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-[#ce8256]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <div>
                    <div class="text-sm text-[#32241b] dark:text-[#c7cbd1] font-medium">本站数据</div>
                    <div class="text-xs text-[#8f949a] mt-0.5">使用网站当前配置数据</div>
                  </div>
                </div>
              </button>
              <button
                @click="openGithubSource"
                class="w-full py-3.5 px-4 rounded-xl border-2 border-[rgba(125,77,51,0.15)] dark:border-[rgba(255,255,255,0.08)] bg-[#fafaf7] dark:bg-[#1f2123] text-left cursor-pointer transition-all duration-200 hover:border-[#ce8256] hover:bg-[rgba(206,130,86,0.04)]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[rgba(76,175,80,0.1)] flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </div>
                  <div>
                    <div class="text-sm text-[#32241b] dark:text-[#c7cbd1] font-medium">GitHub 数据</div>
                    <div class="text-xs text-[#8f949a] mt-0.5">输入 GitHub Raw 仓库地址</div>
                  </div>
                </div>
              </button>
            </template>

            <!-- 本站数据：确认提示 -->
            <template v-else-if="sourceType === 'local'">
              <p class="text-xs text-[#ff9800] dark:text-[#ffb74d] bg-[rgba(255,152,0,0.08)] rounded-lg px-3 py-2 mb-4">
                导入数据将覆盖当前所有编辑内容，请确认后再操作
              </p>
              <div class="flex gap-2">
                <button class="flex-1 py-2.5 px-4 border-none rounded-lg text-xs cursor-pointer bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e8e8e8]" @click="sourceType = null">取消</button>
                <button class="flex-1 py-2.5 px-4 border-none rounded-lg text-xs cursor-pointer bg-[#ce8256] text-white hover:bg-[#b8714a] disabled:opacity-50" :disabled="localLoading" @click="loadLocalData">{{ localLoading ? '加载中...' : '确认导入' }}</button>
              </div>
            </template>

            <!-- GitHub 数据：URL 输入 -->
            <template v-else-if="sourceType === 'github'">
              <div class="mb-1.5">
                <label class="text-[13px] text-[#7a5a48] dark:text-[#a0a5ab] font-medium">GitHub Raw 仓库地址</label>
              </div>
              <div class="relative mb-1">
                <input id="github-url-input" v-model="githubUrl" type="text" placeholder="https://raw.githubusercontent.com/用户名/仓库/分支/" :disabled="githubLoading"
                  :class="['w-full px-4 py-3 border-2 rounded-xl bg-[#fffdf9] dark:bg-[#2b2d30] text-[#32241b] dark:text-gray-100 outline-none text-sm transition-all duration-200', githubLoading ? 'opacity-50' : '', githubError ? 'border-[#ff5f57]' : 'border-[rgba(121,82,57,0.16)] dark:border-[#3a3c3f] focus:border-[#cb7d52]']"
                  @keydown="(e: KeyboardEvent) => { if (!e.isComposing && e.key === 'Enter') loadGithubData() }"
                />
                <svg v-if="githubLoading" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#cb7d52] animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <p v-if="githubError" class="text-[#ff5f57] text-xs mb-4">{{ githubError }}</p>
              <p class="text-[11px] text-[#8f949a] mt-2 mb-4">
                仓库需包含 <code class="bg-[rgba(206,130,86,0.1)] px-1 py-0.5 rounded">chat/base.json</code>、<code class="bg-[rgba(206,130,86,0.1)] px-1 py-0.5 rounded">chat/keyword.json</code> 等文件
              </p>
              <div class="flex gap-2">
                <button class="flex-1 py-2.5 px-4 border-none rounded-lg text-xs cursor-pointer bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e8e8e8]" @click="sourceType = null">取消</button>
                <button class="flex-1 py-2.5 px-4 border-none rounded-lg text-xs cursor-pointer bg-[#4caf50] text-white hover:bg-[#388e3c] disabled:opacity-50" :disabled="githubLoading" @click="loadGithubData">{{ githubLoading ? '加载中...' : '加载' }}</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm shadow-lg bg-[#3d2e2a] text-white dark:bg-[#2a2d30] dark:text-[#e1e3e5]">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.animate-shake { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

/* Editor 内滚动条样式 */
.mac-window :deep(::-webkit-scrollbar) { width: 8px; height: 8px; }
.mac-window :deep(::-webkit-scrollbar-track) { background: transparent; }
.mac-window :deep(::-webkit-scrollbar-thumb) { background: rgba(128, 128, 128, 0.25); border-radius: 4px; }
.mac-window :deep(::-webkit-scrollbar-thumb:hover) { background: rgba(128, 128, 128, 0.45); }
.mac-window :deep(::-webkit-scrollbar-corner) { background: transparent; }
</style>