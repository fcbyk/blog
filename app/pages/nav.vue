<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

/* ================================================================
 *  类型
 * ================================================================ */

type ItemType = 'bookmark' | 'folder'
type ModalPurpose = 'add' | 'edit'
type ModalMode = 'bookmark' | 'folder'

interface BookmarkItem {
  id: string
  type: ItemType
  name: string
  url?: string
  icon?: string
  parentId: string | null
  createdAt: number
}

interface Preview {
  url: string
  title: string
  icon: string
  source: string
}

interface MetaResult {
  title: string
  icon: string
  source: string
}

/* ================================================================
 *  常量
 * ================================================================ */

const STORAGE_KEY = 'bookmarks_v2'
const OLD_KEY = 'bookmarks_v1'
const SEED_KEY = STORAGE_KEY + '_seeded'

/* ================================================================
 *  状态
 * ================================================================ */

const items = ref<BookmarkItem[]>([])
const currentFolderId = ref<string | null>(null)
const searchQuery = ref('')
const toastMsg = ref('')
const toastType = ref('')

/* Modal */
const modalOpen = ref(false)
const modalPurpose = ref<ModalPurpose>('add')
const modalMode = ref<ModalMode>('bookmark')
const editingItemId = ref<string | null>(null)

/* 文件选择器 */
const fileInputRef = ref<HTMLInputElement | null>(null)

let toastTimer: ReturnType<typeof setTimeout> | null = null

/* ================================================================
 *  工具函数
 * ================================================================ */

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function getDefaultIcon(_url?: string): string {
  // 不再使用 Google favicon 服务；无图标时返回空，由卡片回退到默认地球图标
  return ''
}

function normalizeUrl(raw: string): string {
  let url = (raw || '').trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  try {
    const u = new URL(url)
    if (!u.hostname.includes('.')) return ''
    return u.toString()
  } catch {
    return ''
  }
}

function showToast(msg: string, type: '' | 'error' | 'success' = '') {
  toastMsg.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
    toastType.value = ''
  }, 2400)
}

/* ================================================================
 *  存储
 * ================================================================ */

function load() {
  let raw: string | null = null
  try { raw = localStorage.getItem(STORAGE_KEY) } catch {}
  let data: any = []
  if (raw) {
    try { data = JSON.parse(raw) || [] } catch {}
    if (Array.isArray(data) && data.every((it: any) => it && typeof it === 'object' && 'type' in it)) {
      items.value = data
    } else {
      items.value = []
    }
  }

  // 迁移老格式
  if (items.value.length === 0) {
    let oldRaw: string | null = null
    try { oldRaw = localStorage.getItem(OLD_KEY) } catch {}
    if (oldRaw) {
      try {
        const old = JSON.parse(oldRaw)
        if (Array.isArray(old) && old.length > 0) {
          items.value = old
            .filter((b: any) => b && b.url)
            .map((b: any) => ({
              id: b.id || uid(),
              type: 'bookmark',
              name: b.name || '',
              url: b.url,
              icon: b.icon || '',
              parentId: null,
              createdAt: b.createdAt || Date.now()
            }))
          save()
          try { localStorage.removeItem(OLD_KEY) } catch {}
        }
      } catch {}
    }
  }

  // 自愈：缺失字段
  items.value.forEach(it => {
    if (!it.id) it.id = uid()
    if (!it.type) it.type = 'bookmark'
    if (typeof it.parentId === 'undefined') it.parentId = null
  })
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  } catch {
    showToast('存储失败：可能超出容量上限', 'error')
  }
}

/* ================================================================
 *  树形结构辅助
 * ================================================================ */

function getItem(id: string | null): BookmarkItem | null {
  if (!id) return null
  return items.value.find(it => it.id === id) || null
}

function getFolders(parentId: string | null): BookmarkItem[] {
  return items.value.filter(it => it.type === 'folder' && (it.parentId || null) === (parentId || null))
}

function getBookmarks(parentId: string | null): BookmarkItem[] {
  return items.value.filter(it => it.type === 'bookmark' && (it.parentId || null) === (parentId || null))
}

function getDescendantIds(id: string): string[] {
  const ids: string[] = [id]
  function walk(parentId: string | null) {
    for (const it of items.value) {
      if ((it.parentId || null) === (parentId || null)) {
        ids.push(it.id)
        if (it.type === 'folder') walk(it.id)
      }
    }
  }
  walk(id)
  return ids
}

function countInFolder(id: string): number {
  const ids = new Set(getDescendantIds(id))
  return items.value.filter(it => it.type === 'bookmark' && ids.has(it.id)).length
}

function getPath(id: string | null): BookmarkItem[] {
  const path: BookmarkItem[] = []
  if (!id) return path
  let cur: BookmarkItem | null = getItem(id)
  while (cur && cur.type === 'folder') {
    path.unshift(cur)
    cur = cur.parentId ? getItem(cur.parentId) : null
  }
  return path
}

interface FolderOption {
  id: string
  name: string
  depth: number
}

function buildFolderOptions(): FolderOption[] {
  const rows: FolderOption[] = []
  function walk(parentId: string | null, depth: number) {
    const folders = getFolders(parentId)
    for (const f of folders) {
      rows.push({ id: f.id, name: f.name, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

const folderOptions = computed(() => buildFolderOptions())

/* 元信息获取（仅弹窗内使用，已迁出到 BookmarkModal） */

/* ================================================================
 *  CRUD
 * ================================================================ */

function addBookmark(opts: { url: string; name: string; icon?: string; parentId?: string | null }) {
  if (!opts.url) return
  items.value.unshift({
    id: uid(),
    type: 'bookmark',
    url: opts.url,
    name: opts.name || getDomain(opts.url),
    icon: opts.icon || getDefaultIcon(opts.url),
    parentId: opts.parentId === undefined ? currentFolderId.value : opts.parentId,
    createdAt: Date.now()
  })
  save()
  showToast('已添加：' + (opts.name || getDomain(opts.url)), 'success')
}

function addFolder(opts: { name: string; parentId?: string | null }) {
  if (!opts.name) return
  items.value.unshift({
    id: uid(),
    type: 'folder',
    name: opts.name,
    parentId: opts.parentId === undefined ? currentFolderId.value : opts.parentId,
    createdAt: Date.now()
  })
  save()
  showToast('已创建目录：' + opts.name, 'success')
}

function updateItem(id: string, patch: Partial<BookmarkItem>) {
  const it = getItem(id)
  if (!it) return
  Object.assign(it, patch)
  save()
}

function deleteItem(id: string) {
  const it = getItem(id)
  if (!it) return
  if (it.type === 'folder') {
    const ids = new Set(getDescendantIds(id))
    const subFolder = ids.size - 1
    const subBookmarks = [...ids].filter(x => getItem(x)?.type === 'bookmark').length
    const msg = `确认删除目录 "${it.name}"？\n\n` +
                `将同时删除其下 ${subFolder} 个子目录、${subBookmarks} 个书签，且不可撤销。`
    if (!confirm(msg)) return
    items.value = items.value.filter(x => !ids.has(x.id))
    if (currentFolderId.value === id || ids.has(currentFolderId.value || '')) {
      currentFolderId.value = it.parentId || null
    }
  } else {
    if (!confirm(`确认删除书签 "${it.name}"？`)) return
    items.value = items.value.filter(x => x.id !== id)
  }
  save()
  showToast('已删除')
}

/* ================================================================
 *  计算属性 - 当前目录下的内容
 * ================================================================ */

const currentFolders = computed(() => getFolders(currentFolderId.value))
const currentBookmarks = computed(() => getBookmarks(currentFolderId.value))

const filteredFolders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return currentFolders.value
  return items.value.filter(it =>
    it.type === 'folder' && it.name.toLowerCase().includes(q)
  )
})

const filteredBookmarks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return currentBookmarks.value
  return items.value.filter(it =>
    it.type === 'bookmark' && (
      it.name.toLowerCase().includes(q) ||
      (it.url || '').toLowerCase().includes(q) ||
      getDomain(it.url || '').toLowerCase().includes(q)
    )
  )
})

const breadcrumbPath = computed(() => getPath(currentFolderId.value))
const totalBookmarksCount = computed(() => items.value.filter(it => it.type === 'bookmark').length)

const isEmpty = computed(() =>
  filteredFolders.value.length === 0 && filteredBookmarks.value.length === 0
)

/* ================================================================
 *  Modal 操作（实际 UI 在 <DialogBookmarkModal> 组件内）
 * ================================================================ */

function openAddModal() {
  modalPurpose.value = 'add'
  modalMode.value = 'bookmark'
  editingItemId.value = null
  modalOpen.value = true
}

function openEditModal(id: string) {
  if (!getItem(id)) return
  modalPurpose.value = 'edit'
  editingItemId.value = id
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

/* 编辑：父目录禁用自身和子孙目录（在 <DialogBookmarkModal> 中通过 props 传入） */
const folderSelectDisabledSet = computed(() => {
  if (modalPurpose.value !== 'edit' || !editingItemId.value) return new Set<string>()
  return new Set(getDescendantIds(editingItemId.value))
})

/* BookmarkModal emit('submit', payload) 后处理 */
function onModalSubmit(data: any) {
  if (data.action === 'addBookmark') {
    addBookmark({
      url: data.url,
      name: data.name,
      icon: data.icon,
      parentId: data.parentId
    })
  } else if (data.action === 'addFolder') {
    addFolder({ name: data.name, parentId: data.parentId })
  } else if (data.action === 'editBookmark') {
    updateItem(data.id, {
      name: data.name,
      url: data.url,
      icon: data.icon,
      parentId: data.parentId
    })
  } else if (data.action === 'editFolder') {
    updateItem(data.id, { name: data.name, parentId: data.parentId })
  }
}

/* BookmarkModal emit('delete', id) 后处理 */
function onModalDelete(id: string) {
  deleteItem(id)
}

/* ================================================================
 *  编辑模式（由 store 持有，MacMenuBar 下拉菜单也可读写）
 * ================================================================ */

/* ================================================================
 *  图片加载失败的图标 ID 集合（UI 降级显示 emoji 占位）
 * ================================================================ */

const failedIconIds = ref<Set<string>>(new Set())

function onIconError(itemId: string) {
  failedIconIds.value.add(itemId)
}

const navStore = useNavStore()

function setEditMode(on: boolean) {
  navStore.setEditMode(on)
}

/* ================================================================
 *  文件夹导航
 * ================================================================ */

function enterFolder(id: string) {
  currentFolderId.value = id
}

function gotoRoot() {
  currentFolderId.value = null
}

function gotoFolder(id: string) {
  currentFolderId.value = id
}

/* ================================================================
 *  文件夹导航
 * ================================================================ *//* ================================================================
 *  Import / Export / Clear
 * ================================================================ */

function triggerImport() {
  fileInputRef.value?.click()
}

/* 从导入的 <A> 标签提取图标：
   - 优先采用标准 ICON_URI（URL 形式）
   - 其次 ICON 属性若为非 data: 的 URL 才采用（base64 直接忽略）
   - 都没有则返回空，由卡片回退到默认地球图标 */
function extractImportIcon(a: HTMLAnchorElement, baseUrl: string): string {
  const iconUri = a.getAttribute('icon_uri')
  if (iconUri && /^https?:\/\//i.test(iconUri.trim())) {
    return iconUri.trim()
  }
  const icon = a.getAttribute('icon')
  if (icon && !/^data:/i.test(icon.trim())) {
    const trimmed = icon.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    // 可能是相对路径，基于书签 URL 解析为绝对地址
    try { return new URL(trimmed, baseUrl).toString() } catch {}
  }
  return ''
}

async function handleImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    const added = { folders: 0, bookmarks: 0, skipped: 0 }
    function walk(dl: HTMLDListElement, parentId: string | null) {
      for (const node of Array.from(dl.children)) {
        if (node.tagName !== 'DT') continue
        const a = node.querySelector(':scope > a[href]') as HTMLAnchorElement | null
        const h3 = node.querySelector(':scope > h3') as HTMLHeadingElement | null
        if (a) {
          const href = a.getAttribute('href')
          if (href && !/^(place:|javascript:|about:|data:|mailto:)/i.test(href)) {
            const norm = normalizeUrl(href)
            if (norm) {
              if (items.value.some(x => x.type === 'bookmark' && x.url === norm)) {
                added.skipped++
              } else {
                const name = (a.textContent || '').trim() || getDomain(norm)
                const icon = extractImportIcon(a, norm)
                items.value.unshift({
                  id: uid(),
                  type: 'bookmark',
                  url: norm,
                  name,
                  icon,
                  parentId,
                  createdAt: Date.now()
                })
                added.bookmarks++
              }
            } else added.skipped++
          } else added.skipped++
        } else if (h3) {
          const name = (h3.textContent || '').trim() || '(未命名)'
          const newId = uid()
          items.value.unshift({
            id: newId, type: 'folder', name, parentId, createdAt: Date.now()
          })
          added.folders++
          const innerDL = node.querySelector(':scope > dl') as HTMLDListElement | null
          if (innerDL) walk(innerDL, newId)
        }
      }
    }
    const rootDL = doc.querySelector('dl') as HTMLDListElement | null
    if (rootDL) walk(rootDL, null)

    save()
    showToast(`导入完成：${added.folders} 个目录 / ${added.bookmarks} 个书签（跳过 ${added.skipped}）`, 'success')
  } catch (err: any) {
    showToast('导入失败：' + (err?.message || ''), 'error')
  } finally {
    input.value = ''
  }
}

function exportBookmarks() {
  if (items.value.length === 0) {
    showToast('没有可导出的内容', 'error')
    return
  }
  const escapeAttr = (s: string) => String(s).replace(/[<&"]/g, c =>
    ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' }[c]!))

  function indent(level: number) { return '    '.repeat(level + 1) }

  function renderDL(parentId: string | null, level: number): string {
    let out = ''
    const folders = getFolders(parentId)
    const bookmarks = getBookmarks(parentId)
    const ind = indent(level)
    for (const f of folders) {
      out += `${ind}<DT><H3>${escapeAttr(f.name)}</H3>\n`
      out += `${ind}<DL><p>\n`
      out += renderDL(f.id, level + 1)
      out += `${ind}</DL><p>\n`
    }
    for (const b of bookmarks) {
      const iconAttr = (b.icon && !/^data:/i.test(b.icon))
        ? ` ICON_URI="${escapeAttr(b.icon)}"`
        : ''
      out += `${ind}<DT><A HREF="${escapeAttr(b.url || '')}"${iconAttr}>${escapeAttr(b.name)}</A>\n`
    }
    return out
  }

  const body = renderDL(null, 0)
  const html =
`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${body}</DL><p>
`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const ts = new Date().toISOString().slice(0, 10)
  a.download = `bookmarks-${ts}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  showToast('已导出', 'success')
}

function clearAll() {
  if (items.value.length === 0) {
    showToast('已经是空的', 'error')
    return
  }
  if (!confirm(`确认清空全部 ${items.value.length} 项？此操作不可撤销！`)) return
  items.value = []
  currentFolderId.value = null
  save()
  showToast('已清空')
}

/* ================================================================
 *  全局命令（来自 MacMenuBar 下拉菜单）
 * ================================================================ */

function onNavCmd(e: Event) {
  const detail = (e as CustomEvent).detail
  if (!detail || typeof detail.cmd !== 'string') return
  switch (detail.cmd) {
    case 'import': triggerImport(); break
    case 'export': exportBookmarks(); break
    case 'clear':  clearAll(); break
  }
}

/* ================================================================
 *  生命周期 & 初始化
 * ================================================================ */

onMounted(() => {
  load()
  window.addEventListener('nav-cmd', onNavCmd as EventListener)

  // Seed demo (only first run)
  if (items.value.length === 0 && !localStorage.getItem(SEED_KEY)) {
    localStorage.setItem(SEED_KEY, '1')
    const dev = uid()
    const design = uid()
    const web = uid()
    const demos: BookmarkItem[] = [
      { id: dev, type: 'folder', name: '开发', parentId: null, createdAt: Date.now() },
      { id: web, type: 'folder', name: '前端', parentId: dev, createdAt: Date.now() },
      { id: design, type: 'folder', name: '设计', parentId: null, createdAt: Date.now() },
    ]
    const bmDemos = [
      { url: 'https://github.com', name: 'GitHub', parentId: web },
      { url: 'https://developer.mozilla.org', name: 'MDN Web Docs', parentId: web },
      { url: 'https://stackoverflow.com', name: 'Stack Overflow', parentId: web },
      { url: 'https://obsidian.md', name: 'Obsidian', parentId: design },
      { url: 'https://chat.deepseek.com/', name: 'DeepSeek', parentId: dev },
    ]
    for (const d of demos) items.value.unshift(d)
    for (const b of bmDemos) {
      items.value.unshift({
        id: uid(), type: 'bookmark',
        url: b.url, name: b.name,
        icon: getDefaultIcon(b.url), parentId: b.parentId,
        createdAt: Date.now()
      })
    }
    save()
  }
})

onUnmounted(() => {
  window.removeEventListener('nav-cmd', onNavCmd as EventListener)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="h-full w-full flex items-center justify-center">
    <main
      class="mac-window md:mt-5 relative z-10 w-full h-full md:w-[80%] md:h-[85%] rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]"
    >
      <div class="relative w-full h-full pt-10 md:pt-0 rounded-none md:rounded-[14px] bg-[#f5f3ee] dark:bg-[#0d1117] overflow-hidden flex flex-col shadow-none md:shadow-xl dark:shadow-none">
        <!-- 窗口标题栏：左 MacWindowControls + 面包屑｜右 搜索框 -->
        <div class="title-bar relative items-center px-4 select-none hidden md:flex shrink-0 gap-3">
          <div class="absolute left-3.75 top-1/2 -translate-y-1/2">
            <MacWindowControls
              :show-close="true"
              :show-minimize="true"
              :show-maximize="true"
              :clickable="true"
              @close="() => navigateTo('/')"
            />
          </div>
          <!-- 左对齐：面包屑（紧贴三个点的右边） -->
          <div class="flex items-center text-[12px] text-[#555] dark:text-[#aaa] truncate min-w-0 pl-[68px]">
            <button
              type="button"
              class="px-1.5 py-0.5 rounded cursor-default transition-colors hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              @click="gotoRoot"
            >所有书签</button>
            <template v-for="f in breadcrumbPath" :key="f.id">
              <span class="text-[#bbb] dark:text-[#555] px-0.5 shrink-0">/</span>
              <button
                type="button"
                class="px-1.5 py-0.5 rounded cursor-default transition-colors hover:bg-black/5 dark:hover:bg-white/10 truncate"
                :title="f.name"
                @click="gotoFolder(f.id)"
              >{{ f.name }}</button>
            </template>
          </div>
          <!-- 右对齐：搜索框（带图标） -->
          <div class="ml-auto flex items-center shrink-0 w-64 max-w-[40%]">
            <div class="relative w-full">
              <svg
                class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 dark:text-gray-500 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="搜索..."
                spellcheck="false"
                class="title-search"
              >
            </div>
          </div>
        </div>

        <!-- 内容区（仅移动端：让位给顶部 MacMenuBar 的 40px + 显示面包屑） -->
        <div class="nav-content flex-1 overflow-y-auto overflow-x-hidden pb-6">
          <div class="sticky-bar md:hidden">
            <div class="container">
              <nav class="breadcrumb block md:hidden">
                <button
                  type="button"
                  :class="['crumb', currentFolderId === null ? 'root current' : 'root']"
                  @click="gotoRoot"
                >🏠 所有书签</button>
                <template v-for="f in breadcrumbPath" :key="f.id">
                  <span class="sep">/</span>
                  <button
                    type="button"
                    :class="['crumb', f.id === currentFolderId ? 'current' : '']"
                    @click="gotoFolder(f.id)"
                  >{{ f.name }}</button>
                </template>
              </nav>
            </div>
          </div>

          <!-- 列表区（可滚动） -->
          <div class="container">
            <div class="list">
              <!-- Empty -->
              <template v-if="isEmpty">
                <div v-if="searchQuery.trim()" class="empty">
                  <div>没有匹配 "{{ searchQuery }}" 的内容</div>
                </div>
                <div v-else-if="currentFolderId && !navStore.editMode" class="empty">
                  <IconFolder class="empty-folder-svg" />
                  <div>这个目录是空的</div>
                  <div class="hint">在上方输入网址添加，或新建子目录</div>
                </div>
                <div v-else-if="!navStore.editMode" class="empty">还没有书签</div>
              </template>

              <!-- Folder cards -->
              <div
                v-for="f in filteredFolders"
                :key="f.id"
                class="card folder"
                @click="enterFolder(f.id)"
              >
                <div v-if="navStore.editMode" class="actions">
                  <button
                    class="btn-icon"
                    title="重命名"
                    @click.stop="openEditModal(f.id)"
                  >✏️</button>
                </div>
                <div class="folder-body">
                  <div class="folder-icon"><IconFolder class="folder-svg" /></div>
                  <div class="folder-name" :title="f.name">{{ f.name }}</div>
                  <div class="folder-meta">{{ countInFolder(f.id) }} 项</div>
                </div>
              </div>

              <!-- Bookmark cards -->
              <div
                v-for="b in filteredBookmarks"
                :key="b.id"
                class="card bookmark"
              >
                <div v-if="navStore.editMode" class="actions">
                  <button
                    class="btn-icon"
                    title="编辑名称、移动目录、更换图标"
                    @click.stop.prevent="openEditModal(b.id)"
                  >✏️</button>
                </div>
                <a
                  class="card-link"
                  :href="b.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    v-if="b.icon && !failedIconIds.has(b.id)"
                    class="icon"
                    :src="b.icon"
                    :data-url="b.url"
                    alt=""
                    @error="onIconError(b.id)"
                  >
                  <IconGlobe v-else class="icon-svg" aria-hidden="true" />
                  <div class="name" :title="b.name">{{ b.name }}</div>
                  <div class="url" :title="b.url">{{ getDomain(b.url || '') }}</div>
                </a>
              </div>

              <!-- Add placeholder card -->
              <div
                v-if="navStore.editMode && !searchQuery.trim()"
                class="card add-card"
                role="button"
                aria-label="添加书签到当前目录"
                @click="openAddModal"
              >
                <div class="add-body">
                  <div class="add-icon">+</div>
                  <div class="add-text">添加到这里</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <Transition name="toast-anim">
          <div
            v-if="toastMsg"
            :class="['toast-visible', toastType]"
          >{{ toastMsg }}</div>
        </Transition>

        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          class="file-hidden"
          accept=".html,.htm,text/html"
          @change="handleImportFile"
        >

        <!-- Bookmark modal（独立组件，详见 components/dialog/BookmarkModal.vue） -->
        <DialogBookmarkModal
          v-model="modalOpen"
          v-model:mode="modalMode"
          :purpose="modalPurpose"
          :editing-id="editingItemId"
          :default-parent-id="currentFolderId"
          :items="items"
          :folder-options="folderOptions"
          :folder-select-disabled-set="folderSelectDisabledSet"
          @submit="onModalSubmit"
          @delete="onModalDelete"
          @error="(msg: string) => showToast(msg, 'error')"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 标题栏（含面包屑 + 搜索框，比普通 title-bar 略高） */
.title-bar {
  height: 36px;
  min-height: 36px;
}

/* 标题栏内紧凑搜索框 */
.title-search {
  width: 100%;
  background: transparent;
  border: 0;
  color: #1f2937;
  padding: 5px 12px 5px 32px;
  border-radius: 0;
  font-size: 12px;
  outline: none;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: box-shadow 0.15s;
}
.title-search::placeholder {
  color: #9ca3af;
}
.title-search:focus {
  /* 焦点：input 下方一条 1px 直线（柔和灰） */
  box-shadow: 0 1px 0 0 #9ca3af;
}
.dark .title-search {
  background: transparent;
  color: #e6edf3;
}
.dark .title-search:focus {
  box-shadow: 0 1px 0 0 #6b7280;
}
.dark .title-search::placeholder {
  color: #6b7280;
}

/* 固定头：移动/桌面端均 sticky。mac-window 用 pt-10 md:pt-0 让位 MacMenuBar，
   滚动容器 nav-content 的可见顶部恰好是 MacMenuBar 下方，sticky top:0 不会被遮挡 */
.sticky-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: #f5f3ee;
}
.dark .sticky-bar {
  background-color: #0d1117;
}
/* sticky-bar 整体内容是面包屑（mobile）：上下紧密贴 */
.sticky-bar > .container {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Container */
.nav-content {
  background: #f5f3ee;
  color: #1f2937;
}
.dark .nav-content {
  background: #0d1117;
  color: #e6edf3;
}

.container {
  /* 中和 Tailwind 全局 .container 的响应式 max-width 与 auto 居中，
     否则会限制网格宽度并产生左右留白 */
  max-width: none;
  margin: 0;
  width: 100%;
  padding: 24px 20px 10px;
}

/* Breadcrumb */
.btn-ghost.danger {
  background: transparent;
  border-color: #d93d3d;
  color: #d93d3d;
}
.btn-ghost.danger:hover {
  background: rgba(217, 61, 61, 0.1);
}
.btn-ghost.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.dark .btn-ghost.danger {
  border-color: #f85149;
  color: #f85149;
}
.dark .btn-ghost.danger:hover {
  background: rgba(248, 81, 73, 0.1);
}
.dark .btn-ghost.active {
  background: #58a6ff;
  border-color: #58a6ff;
  color: #fff;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 14px;
  color: #6b7280;
}
.dark .breadcrumb {
  color: #8b949e;
}
.crumb {
  background: transparent;
  border: 0;
  color: #6b7280;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  transition: background 0.12s, color 0.12s;
}
.crumb:hover {
  background: #ebe7dd;
  color: #1f2937;
}
.dark .crumb {
  color: #8b949e;
}
.dark .crumb:hover {
  background: #1f262e;
  color: #e6edf3;
}
.crumb.root {
  color: #1f2937;
  font-weight: 500;
}
.dark .crumb.root {
  color: #e6edf3;
}
.crumb.current {
  color: #1f2937;
  font-weight: 500;
  cursor: default;
}
.crumb.current:hover {
  background: transparent;
}
.dark .crumb.current {
  color: #e6edf3;
}
.sep {
  color: #d4cfc4;
  user-select: none;
  padding: 0 2px;
}
.dark .sep {
  color: #30363d;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.search {
  flex: 1;
  min-width: 200px;
  position: relative;
}
.search input {
  width: 100%;
  background: transparent;
  border: 0;
  color: #1f2937;
  padding: 10px 14px 10px 38px;
  border-radius: 0;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: box-shadow 0.15s;
}
.search input:focus {
  /* 焦点：input 下方一条 1px 直线（柔和灰） */
  box-shadow: 0 1px 0 0 #9ca3af;
}
.dark .search input {
  background: transparent;
  border: 0;
  color: #e6edf3;
}
.dark .search input:focus {
  box-shadow: 0 1px 0 0 #6b7280;
}
/* Grid */
.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

/* Card base */
.card {
  background: #ffffff;
  border: 1px solid #d4cfc4;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  transition: transform 0.12s, border-color 0.15s, background 0.15s;
  display: flex;
  flex-direction: column;
}
.dark .card {
  background: #161b22;
  border-color: #30363d;
}
.card:hover {
  border-color: rgba(37, 99, 235, 0.5);
  transform: translateY(-1px);
}
.dark .card:hover {
  border-color: rgba(88, 166, 255, 0.5);
}

/* Bookmark card */
.card.bookmark .card-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px 14px;
  text-decoration: none;
  color: inherit;
  gap: 10px;
  flex: 1;
  width: 100%;
}
.icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}
.icon-svg {
  width: 40px;
  height: 40px;
  color: #6b7280;
}
.dark .icon-svg {
  color: #8b949e;
}
.name {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.url {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  margin-top: auto;
}
.dark .url {
  color: #8b949e;
}

/* Folder card */
.card.folder {
  cursor: pointer;
}
.card.folder .folder-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px 14px;
  gap: 8px;
  flex: 1;
  width: 100%;
}
.card.folder .folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.card.folder .folder-icon .folder-svg {
  width: 40px;
  height: auto;
}
.card.folder .folder-name {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card.folder .folder-meta {
  margin-top: auto;
  font-size: 11px;
  color: #6b7280;
}
.dark .card.folder .folder-meta {
  color: #8b949e;
}

/* Card actions */
.actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  z-index: 2;
}
.btn-icon {
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #d4cfc4;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
}
.btn-icon:hover {
  background: #30363d;
  border-color: #30363d;
}
.btn-icon.danger:hover {
  background: #d93d3d;
  border-color: #d93d3d;
}
.dark .btn-icon {
  border-color: #30363d;
}
.dark .btn-icon.danger:hover {
  background: #f85149;
  border-color: #f85149;
}

/* Add card */
.card.add-card {
  background: transparent;
  border: 2px dashed #d4cfc4;
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}
.card.add-card:hover {
  background: #ffffff;
  border-color: #2563eb;
  transform: translateY(0);
}
.dark .card.add-card:hover {
  background: #161b22;
  border-color: #58a6ff;
}
.add-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}
.dark .add-body {
  color: #8b949e;
}
.add-body .add-icon {
  font-size: 40px;
  font-weight: 300;
  line-height: 1;
}
.add-body .add-text {
  font-size: 12px;
}
.card.add-card:hover .add-body {
  color: #1f2937;
}
.dark .card.add-card:hover .add-body {
  color: #e6edf3;
}

/* Empty */
.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
  font-size: 14px;
}
.dark .empty {
  color: #8b949e;
}
.empty .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}
.empty .empty-folder-svg {
  display: block;
  width: 48px;
  height: auto;
  margin: 0 auto 12px;
}
.empty .hint {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.7;
}

/* Toast */
.toast-visible {
  position: fixed;
  bottom: 24px;
  left: 50%;
  background: #ffffff;
  border: 1px solid #d4cfc4;
  color: #1f2937;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.toast-visible.error {
  border-color: #d93d3d;
  color: #d93d3d;
}
.toast-visible.success {
  border-color: #2da44e;
  color: #2da44e;
}
.dark .toast-visible {
  background: #161b22;
  border-color: #30363d;
  color: #e6edf3;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.dark .toast-visible.error {
  border-color: #f85149;
  color: #f85149;
}
.dark .toast-visible.success {
  border-color: #3fb950;
  color: #3fb950;
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.25s ease;
}
.toast-anim-enter-from,
.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(80px);
}
.toast-anim-enter-to,
.toast-anim-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.file-hidden { display: none; }

/* （弹窗样式已迁到 components/dialog/BookmarkModal.vue） */

/* Scrollbar */
.nav-content::-webkit-scrollbar { width: 8px; height: 8px; }
.nav-content::-webkit-scrollbar-track { background: transparent; }
.nav-content::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.25);
  border-radius: 4px;
}
.nav-content::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.45);
}
.nav-content::-webkit-scrollbar-corner { background: transparent; }

@media (max-width: 640px) {
  .container { padding: 16px 12px 40px; }
  .list { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
}
</style>
