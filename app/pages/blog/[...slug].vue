<script setup lang="ts">
import { api, ApiTimeoutError } from '~~/app/composables/useApi'
const route = useRoute()
const router = useRouter()

const { tree, flatFiles, loading: treeLoading, error: treeError, fetchTree } = useBlogTree()

const activePath = ref('')
const rawMarkdown = ref('')
const loading = ref(false)
const loadError = ref(false)
const loadTimeout = ref(false)
const contentRef = ref<HTMLElement>()
const expandedFolders = ref<Set<string>>(new Set())
const sidebarCollapsed = ref(false)

// URL slug → 内部文件路径（补 .md 后缀）
function slugToPath(): string {
  const slug = route.params.slug as string[] | undefined
  if (!slug) return ''
  const path = slug.join('/')
  return path.endsWith('.md') ? path : path + '.md'
}

// 切换文件夹展开
function toggleFolder(path: string) {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}

// 内容缓存
const contentCache = new Map<string, string>()

// 加载 markdown 内容
async function loadContent() {
  if (!activePath.value) return
  if (contentCache.has(activePath.value)) {
    rawMarkdown.value = contentCache.get(activePath.value)!
    loading.value = false
    loadError.value = false
    return
  }
  const target = activePath.value
  loading.value = true
  loadError.value = false
  loadTimeout.value = false
  try {
    const res: string = await api('/api/proxy/raw', {
      query: { url: `/md/${target}` },
    }) as string
    if (activePath.value !== target) return
    contentCache.set(target, res)
    rawMarkdown.value = res
  } catch (err) {
    console.error(err instanceof ApiTimeoutError ? '加载内容超时' : '加载内容失败', err)
    if (err instanceof ApiTimeoutError) {
      loadTimeout.value = true
    }
    loadError.value = true
  }
  loading.value = false
}

const renderedHtml = computed(() => renderMarkdown(rawMarkdown.value))

// 点击文件
function selectFile(path: string) {
  const clean = path.replace(/\.md$/, '')
  router.push('/blog/' + clean)
}

// 拦截 md 内部链接
function handleContentClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('a')
  if (!target) return
  const href = target.getAttribute('href')
  if (!href) return
  if (href.startsWith('/') && !href.startsWith('//')) {
    e.preventDefault()
    const path = href.replace(/^\//, '')
    selectFile(path + '.md')
  }
}

// 监听 URL 变化
watch(() => route.params.slug, () => {
  const newPath = slugToPath()
  if (newPath && newPath !== activePath.value) {
    activePath.value = newPath
  } else if (!newPath && flatFiles.value.length > 0) {
    activePath.value = flatFiles.value[0]?.path ?? ''
  }
})

// activePath 变化 → 加载内容
watch(activePath, () => {
  loadContent()
  nextTick(() => {
    contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  })
})

// 初始化
onMounted(async () => {
  await fetchTree()
  for (const item of tree.value) {
    if (item.type === 'folder') {
      expandedFolders.value.add(item.path)
    }
  }
  const urlPath = slugToPath()
  if (urlPath && flatFiles.value.some((f) => f.path === urlPath)) {
    activePath.value = urlPath
  } else if (flatFiles.value.length > 0) {
    activePath.value = flatFiles.value[0]?.path ?? ''
    if (!urlPath) {
      const clean = activePath.value.replace(/\.md$/, '')
      router.replace('/blog/' + clean)
    }
  }
})

function handleClose() {
  navigateTo('/')
}
</script>

<template>
  <div class="h-full w-full relative">
    <main
      class="mac-window absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1 w-full h-full md:w-[70%] md:h-[85%] md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]"
    >
      <div class="flex w-full h-full bg-[rgba(255,250,244,0.92)] dark:bg-[#1a1c1e]/92 backdrop-blur-md relative">
        <!-- macOS 风格窗口控制按钮 + 侧边栏切换 -->
        <div class="absolute top-4 left-4 z-10 hidden md:flex items-center gap-2">
          <MacWindowControls
            :show-close="true"
            :show-minimize="true"
            :show-maximize="true"
            :clickable="true"
            @close="handleClose"
          />
          <button
            class="ml-2 p-1 rounded-md border-none cursor-pointer text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="5" y1="2" x2="5" y2="14" />
              <line :x1="sidebarCollapsed ? 8 : 3" y1="5" :x2="sidebarCollapsed ? 8 : 3" y2="11" />
            </svg>
          </button>
        </div>

        <!-- 左侧目录树 -->
        <nav
          class="flex-col pt-14 pb-6 hidden md:flex overflow-hidden"
          :style="{
            width: sidebarCollapsed ? '0' : '220px',
            minWidth: sidebarCollapsed ? '0' : '220px',
            paddingLeft: sidebarCollapsed ? '0' : '0.75rem',
            paddingRight: sidebarCollapsed ? '0' : '0.75rem',
            opacity: sidebarCollapsed ? '0' : '1',
            transition: 'width 300ms ease-in-out, min-width 300ms ease-in-out, padding 300ms ease-in-out, opacity 200ms ease-in-out',
            overflowY: sidebarCollapsed ? 'hidden' : 'auto',
            overscrollBehavior: 'none',
          }"
        >
          <!-- 加载中 -->
          <div v-if="treeLoading" class="flex items-center justify-center py-8">
            <div class="w-5 h-5 border-2 border-[#ce8256] border-t-transparent rounded-full animate-spin" />
          </div>

          <!-- 目录加载失败 -->
          <div v-else-if="treeError" class="flex flex-col items-center gap-3 py-8 px-4">
            <span class="text-xs text-[#8f949a] text-center">加载失败</span>
            <button
              class="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs text-white bg-[#ce8256] hover:bg-[#a05a2c] transition-colors"
              @click="fetchTree()"
            >
              重试
            </button>
          </div>

          <!-- 递归目录 -->
          <template v-else>
            <template v-for="item in tree" :key="item.path">
              <button
                v-if="item.type === 'folder'"
                class="flex items-center gap-1.5 w-full py-2 px-3 rounded-lg border-none cursor-pointer text-sm text-left font-normal text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.08)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                @click="toggleFolder(item.path)"
              >
                <span class="text-xs transition-transform shrink-0" :class="{ 'rotate-90': expandedFolders.has(item.path) }">▶</span>
                <span class="truncate">{{ item.name }}</span>
              </button>
              <div v-if="item.type === 'folder' && expandedFolders.has(item.path)" class="ml-3">
                <button
                  v-for="child in item.children"
                  :key="child.path"
                  :class="[
                    'block w-full py-2 px-3 rounded-lg border-none cursor-pointer text-sm text-left font-normal truncate transition-colors',
                    activePath === child.path
                      ? 'bg-[#ce8256] text-[#fff8f2]'
                      : 'text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]',
                  ]"
                  @click="selectFile(child.path)"
                >
                  {{ child.name }}
                </button>
              </div>

              <button
                v-else-if="item.type === 'file'"
                :class="[
                  'block w-full py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-sm text-left font-normal truncate transition-colors',
                  activePath === item.path
                    ? 'bg-[#ce8256] text-[#fff8f2]'
                    : 'text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[rgba(125,77,51,0.1)] dark:hover:bg-[rgba(255,255,255,0.06)]',
                ]"
                @click="selectFile(item.path)"
              >
                {{ item.name }}
              </button>
            </template>
          </template>
        </nav>

        <!-- 右侧 md 内容区域 -->
        <div ref="contentRef" class="flex-1 h-full bg-white dark:bg-[#181a1c] relative overflow-y-auto" style="overscroll-behavior: none">
          <!-- 目录树加载失败 -->
          <div v-if="treeError" class="flex items-center justify-center h-full">
            <div class="flex flex-col items-center gap-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ce8256" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span class="text-sm text-[#8f949a]">加载目录失败，请检查网络</span>
              <button
                class="px-5 py-2 rounded-lg border-none cursor-pointer text-sm text-white bg-[#ce8256] hover:bg-[#a05a2c] transition-colors"
                @click="fetchTree()"
              >
                重新加载
              </button>
            </div>
          </div>

          <!-- 文章内容加载失败 -->
          <div v-else-if="loadError" class="flex items-center justify-center h-full">
            <div class="flex flex-col items-center gap-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ce8256" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span class="text-sm text-[#8f949a]">{{ loadTimeout ? '加载超时，请检查网络后重试' : '加载文章失败，请重试' }}</span>
              <button
                class="px-5 py-2 rounded-lg border-none cursor-pointer text-sm text-white bg-[#ce8256] hover:bg-[#a05a2c] transition-colors"
                @click="loadContent()"
              >
                重新加载
              </button>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-else-if="loading || treeLoading" class="flex items-center justify-center h-full">
            <div class="flex flex-col items-center gap-3">
              <div class="w-6 h-6 border-2 border-[#ce8256] border-t-transparent rounded-full animate-spin" />
              <span class="text-sm text-[#8f949a]">{{ treeLoading ? '加载目录...' : '加载中...' }}</span>
            </div>
          </div>

          <!-- 内容 -->
          <article
            v-else
            class="md-content max-w-none p-8 pb-16 md:p-12 md:pb-20"
            v-html="renderedHtml"
            @click="handleContentClick"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ========== 亮色模式 ========== */
:deep(pre) {
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
  background: #f8f8f8;
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

:deep(pre code) {
  font-size: 0.875rem;
  line-height: 1.625;
}

:deep(code) {
  font-size: 0.875rem;
  background: #f3f4f6;
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
}

:deep(pre code) {
  background: transparent;
  padding: 0;
}

:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

:deep(th),
:deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  text-align: left;
}

:deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

:deep(blockquote) {
  border-left: 4px solid #ce8256;
  background: #fff7ed;
  padding: 0.25rem 1rem;
  margin: 1rem 0;
  font-style: italic;
}

:deep(a) {
  color: #ce8256;
  text-decoration: underline;
}

:deep(a:hover) {
  color: #a05a2c;
}

:deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 2rem 0 1rem;
  color: #4a3022;
}

:deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: #4a3022;
}

:deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
  color: #4a3022;
}

:deep(ul),
:deep(ol) {
  padding-left: 1.5rem;
  margin: 0.75rem 0;
}

:deep(li) {
  margin: 0.25rem 0;
}

:deep(p) {
  margin: 0.75rem 0;
  line-height: 1.75;
}

:deep(img) {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

:deep(hr) {
  margin: 2rem 0;
  border-color: #e5e7eb;
}
</style>
