<script setup lang="ts">
import type { Datas } from '@shared/types'

const props = defineProps<{
  page: 'base' | 'reply' | 'url' | 'menu'
  datas: Datas
}>()

const emit = defineEmits<{
  (e: 'applied', key: DataKey): void
}>()

type DataKey = 'baseConfig' | 'keywordReplies' | 'regexReplies' | 'urlTriggers'

// ─── 回复规则页双 Tab ───
const replyTab = ref<'keyword' | 'regex'>('keyword')

// 当前活动数据键
const activeDataKey = computed<DataKey>(() => {
  switch (props.page) {
    case 'base':
    case 'menu':
      return 'baseConfig'
    case 'reply':
      return replyTab.value === 'keyword' ? 'keywordReplies' : 'regexReplies'
    case 'url':
      return 'urlTriggers'
  }
})

// ─── 每个 dataKey 独立维护编辑缓冲 ───
const buffers = reactive<Record<DataKey, string>>({
  baseConfig: '',
  keywordReplies: '',
  regexReplies: '',
  urlTriggers: ''
})

// 从 store 同步到缓冲
function syncFromStore(key: DataKey) {
  if (!props.datas) return
  buffers[key] = JSON.stringify(props.datas[key], null, 2)
  if (key === activeDataKey.value) {
    currentText.value = buffers[key]
  }
}

// 当前编辑文本（必须在 syncFromStore 调用前声明，因为 syncFromStore 会设置它）
const currentText = ref('')

// 初始化所有缓冲
syncFromStore('baseConfig')
syncFromStore('keywordReplies')
syncFromStore('regexReplies')
syncFromStore('urlTriggers')

// 标记每个缓冲是否已被用户编辑过（脏状态）
const dirtyKeys = reactive<Record<DataKey, boolean>>({
  baseConfig: false,
  keywordReplies: false,
  regexReplies: false,
  urlTriggers: false
})

// 外部数据变化时，同步非脏缓冲（例如编辑模式下改了数据后切回源码）
watch(() => props.datas, () => {
  for (const k of Object.keys(dirtyKeys) as DataKey[]) {
    if (!dirtyKeys[k]) syncFromStore(k)
  }
}, { deep: true })

const appDataManager = useAppDataManager()

// 切换 Tab/页面时同步
watch(activeDataKey, (key) => {
  currentText.value = buffers[key]
})

// ─── 文件导入/导出（基于当前活动 Tab/页面） ───
const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const result = await appDataManager.importDataFile(file, activeDataKey.value)
  if (result.success) {
    syncFromStore(activeDataKey.value)
  }
  input.value = ''
}

function handleExport() {
  switch (activeDataKey.value) {
    case 'baseConfig': appDataManager.exportBaseConfig(); break
    case 'keywordReplies': appDataManager.exportKeywordReplies(); break
    case 'regexReplies': appDataManager.exportRegexReplies(); break
    case 'urlTriggers': appDataManager.exportUrlTriggers(); break
  }
}

// 应用更改
const parseError = ref('')
const applyStatus = ref<'idle' | 'success' | 'error'>('idle')
let applyTimer: ReturnType<typeof setTimeout>

function applyChanges() {
  const result = appDataManager.applyJsonEdit(activeDataKey.value, currentText.value)
  if (result.success) {
    parseError.value = ''
    applyStatus.value = 'success'
    dirtyKeys[activeDataKey.value] = false
    syncFromStore(activeDataKey.value)
    emit('applied', activeDataKey.value)
  } else {
    parseError.value = result.message
    applyStatus.value = 'error'
  }
  clearTimeout(applyTimer)
  applyTimer = setTimeout(() => { applyStatus.value = 'idle' }, 2000)
}

// 暴露给父组件：切换视图前自动应用
function tryApplyAll(): boolean {
  const dirty = Object.entries(dirtyKeys).filter(([, v]) => v) as [DataKey, boolean][]
  if (dirty.length === 0) return true

  for (const [key] of dirty) {
    const result = appDataManager.applyJsonEdit(key, buffers[key])
    if (!result.success) {
      parseError.value = result.message
      applyStatus.value = 'error'
      // 切换到有问题的 tab
      if (key === 'keywordReplies' || key === 'regexReplies') {
        replyTab.value = key === 'keywordReplies' ? 'keyword' : 'regex'
      }
      return false
    }
    dirtyKeys[key] = false
  }
  return true
}

defineExpose({ tryApplyAll })

// ─── key 高亮 ───
function highlightKeys(json: string): string {
  if (!json.trim()) return ' '
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="j-key">$1</span>:')
}

// ─── 行号 ───
const lineCount = computed(() => currentText.value.split('\n').length)
const lineNumbers = computed(() =>
  Array.from({ length: lineCount.value }, (_, i) => i + 1).join('\n')
)

// ─── 滚动同步 ───
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLPreElement | null>(null)
const lineNumRef = ref<HTMLPreElement | null>(null)

function syncScroll() {
  if (textareaRef.value && highlightRef.value && lineNumRef.value) {
    highlightRef.value.scrollTop = textareaRef.value.scrollTop
    highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
    lineNumRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

// Tab 键处理
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = e.target as HTMLTextAreaElement
    const start = ta.selectionStart
    const end = ta.selectionEnd
    currentText.value = currentText.value.substring(0, start) + '  ' + currentText.value.substring(end)
    // 恢复光标位置
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + 2
    })
  }
  // Ctrl+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    applyChanges()
  }
}

const isDirty = computed(() => dirtyKeys[activeDataKey.value])

// 初始化 + 切换 Tab 时更新高亮
function refreshHighlight() {
  if (highlightRef.value) {
    highlightRef.value.innerHTML = highlightKeys(currentText.value)
  }
}

onMounted(refreshHighlight)
watch(activeDataKey, refreshHighlight)

// 输入处理
function onInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  currentText.value = val
  buffers[activeDataKey.value] = val
  dirtyKeys[activeDataKey.value] = true
  if (highlightRef.value) {
    highlightRef.value.innerHTML = highlightKeys(val)
  }
}

const displayFilename = computed(() => {
  switch (props.page) {
    case 'base':
    case 'menu':
      return 'base.json'
    case 'url':
      return 'url.json'
    case 'reply':
      return replyTab.value === 'keyword' ? 'keyword.json' : 'regex.json'
    default:
      return ''
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between px-4 py-2 shrink-0 gap-2 border-b border-[rgba(125,77,51,0.08)] dark:border-[rgba(255,255,255,0.05)] bg-[#fafaf9] dark:bg-[#141516]">
      <!-- 回复规则页 Tab 切换 -->
      <div v-if="page === 'reply'" class="flex items-center gap-0">
        <button
          v-for="tab in [
            { key: 'keyword' as const, label: 'keyword.json' },
            { key: 'regex' as const, label: 'regex.json' }
          ]"
          :key="tab.key"
          @click="replyTab = tab.key"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors duration-150',
            replyTab === tab.key
              ? 'bg-[rgba(206,130,86,0.12)] text-[#ce8256]'
              : 'text-[#8f949a] hover:text-[#6f4c39] dark:hover:text-[#c7cbd1] cursor-pointer'
          ]"
        >
          {{ tab.label }}
          <span
            v-if="dirtyKeys[tab.key === 'keyword' ? 'keywordReplies' : 'regexReplies']"
            class="w-1.5 h-1.5 rounded-full bg-[#ce8256]"
          />
        </button>
      </div>
      <div v-else class="text-xs text-[#8f949a] font-mono">{{ displayFilename }}</div>

      <div class="flex items-center gap-1.5">
        <!-- 隐藏的文件选择器 -->
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileChange"
        />

        <button
          @click="triggerImport"
          class="px-2.5 py-1 text-[11px] rounded-md border border-[rgba(125,77,51,0.12)] dark:border-[rgba(255,255,255,0.06)] bg-transparent text-[#8f949a] cursor-pointer transition-all duration-150 hover:text-[#6f4c39] hover:border-[rgba(125,77,51,0.25)] dark:hover:text-[#c7cbd1]"
        >
          导入
        </button>

        <button
          @click="handleExport"
          class="px-2.5 py-1 text-[11px] rounded-md border border-[rgba(125,77,51,0.12)] dark:border-[rgba(255,255,255,0.06)] bg-transparent text-[#8f949a] cursor-pointer transition-all duration-150 hover:text-[#6f4c39] hover:border-[rgba(125,77,51,0.25)] dark:hover:text-[#c7cbd1]"
        >
          导出
        </button>

        <div class="w-px h-3.5 mx-0.5 bg-[rgba(125,77,51,0.1)] dark:bg-[rgba(255,255,255,0.06)]" />

        <span v-if="parseError" class="text-[11px] text-red-500 truncate max-w-60" :title="parseError">{{ parseError }}</span>
        <button
          @click="applyChanges"
          :disabled="!isDirty"
          :class="[
            'px-2.5 py-1 text-[11px] rounded-md border transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
            applyStatus === 'success'
              ? 'border-green-400 text-green-500 bg-green-50 dark:bg-green-900/20'
              : applyStatus === 'error'
                ? 'border-red-400 text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-[rgba(125,77,51,0.15)] dark:border-[rgba(255,255,255,0.08)] bg-transparent text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.08)]'
          ]"
        >
          {{ applyStatus === 'success' ? '已应用' : applyStatus === 'error' ? '格式错误' : '应用更改' }}
        </button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="flex-1 min-h-0 overflow-hidden bg-[#f8f6f3] dark:bg-[#111213] relative">
      <div class="flex h-full">
        <!-- 行号 -->
        <pre
          ref="lineNumRef"
          class="line-nums shrink-0 w-10 text-right pr-2 select-none overflow-hidden"
        >{{ lineNumbers }}</pre>

        <!-- 编辑区域 -->
        <div class="flex-1 relative overflow-hidden">
          <pre
            ref="highlightRef"
            class="editor-highlight"
            aria-hidden="true"
          />
          <textarea
            ref="textareaRef"
            :value="currentText"
            class="editor-textarea"
            spellcheck="false"
            @input="onInput"
            @scroll="syncScroll"
            @keydown="handleKeydown"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 行号 */
.line-nums {
  margin: 0;
  padding: 12px 6px 12px 4px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #8b949e;
  background: rgba(0, 0, 0, 0.02);
  border-right: 1px solid rgba(125, 77, 51, 0.06);
  overflow: hidden;
  white-space: pre;
}
.dark .line-nums {
  background: rgba(255, 255, 255, 0.01);
  color: #484f58;
}

/* 高亮层 */
.editor-highlight {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 12px 12px 12px 8px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  overflow: hidden;
  pointer-events: none;
  tab-size: 2;
  color: #24292f;
}

/* 透明 textarea */
.editor-textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 12px 12px 12px 8px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: transparent;
  caret-color: #ce8256;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow: auto;
  white-space: pre;
  tab-size: 2;
}

/* key 颜色 */
.editor-highlight :deep(.j-key) { color: #8250df; }
</style>

<style>
.dark .editor-highlight { color: #ffffff; }
.dark .editor-highlight .j-key { color: #d2a8ff; }
</style>
