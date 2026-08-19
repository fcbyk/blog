<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

/* ================================================================
 *  类型
 * ================================================================ */

type ItemType = 'bookmark' | 'folder'
type ModalPurpose = 'add' | 'edit'
type ModalMode = 'bookmark' | 'folder'

export interface BookmarkItem {
  id: string
  type: ItemType
  name: string
  url?: string
  icon?: string
  parentId: string | null
  createdAt: number
}

export interface FolderOption {
  id: string
  name: string
  depth: number
}

interface Preview {
  url: string
  title: string
  icon: string
  source: string
}

/* ================================================================
 *  Props / Emits
 * ================================================================ */

interface Props {
  modelValue: boolean
  purpose: ModalPurpose
  mode: ModalMode
  editingId: string | null
  defaultParentId: string | null
  items: BookmarkItem[]
  folderOptions: FolderOption[]
  folderSelectDisabledSet?: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  purpose: 'add',
  mode: 'bookmark',
  editingId: null,
  defaultParentId: null,
  items: () => [],
  folderOptions: () => [],
  folderSelectDisabledSet: () => new Set()
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:mode', value: ModalMode): void
  (e: 'submit', data: any): void
  (e: 'error', message: string): void
  (e: 'delete', id: string): void
}>()

/* ================================================================
 *  表单状态
 * ================================================================ */

const formUrl = ref('')
const formName = ref('')
const formIcon = ref('')
const formFolderName = ref('')
const formParentId = ref<string | null>(null)

const currentPreview = ref<Preview | null>(null)
const previewVisible = ref(false)
const previewUrl = ref('')
const previewIcon = ref('')
const previewName = ref('')
const previewStatusText = ref('')
const previewStatusKind = ref<'' | 'ok' | 'fail'>('')

const formUrlRef = ref<HTMLInputElement | null>(null)
const formNameRef = ref<HTMLInputElement | null>(null)
const formFolderNameRef = ref<HTMLInputElement | null>(null)
const previewNameRef = ref<HTMLInputElement | null>(null)
const modalMaskRef = ref<HTMLDivElement | null>(null)

let urlDebounce: ReturnType<typeof setTimeout> | null = null

/* ================================================================
 *  工具函数
 * ================================================================ */

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function getDefaultIcon(url: string): string {
  const domain = getDomain(url)
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
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

function titleFromHtml(text: string): string {
  const t = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (t) return decodeHtml(t[1]).trim()
  const og = text.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
  if (og) return decodeHtml(og[1]).trim()
  const tw = text.match(/<meta\s+(?:name|property)=["']twitter:title["']\s+content=["']([^"']+)["']/i)
  if (tw) return decodeHtml(tw[1]).trim()
  return ''
}

function decodeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x([\da-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(parseInt(d, 10)))
}

/* ================================================================
 *  元信息获取 + 预览
 * ================================================================ */

async function fetchMeta(url: string): Promise<{ title: string; icon: string; source: string }> {
  let title = ''
  let icon = ''
  let source = ''

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      { signal: ctrl.signal }
    )
    clearTimeout(t)
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success' && data.data) {
        title = data.data.title || ''
        icon = data.data.logo || data.data.image || ''
        if (title) source = 'microlink'
      }
    }
  } catch {}

  if (!title) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(url, {
        signal: ctrl.signal, mode: 'cors', credentials: 'omit', redirect: 'follow'
      })
      clearTimeout(t)
      if (res.ok) {
        const text = await res.text()
        title = titleFromHtml(text)
        if (title) source = source || 'direct'
        if (!icon) {
          const im = text.match(/<link[^>]+rel=["'](?:icon|shortcut\s+icon|apple-touch-icon)[^>]*href=["']([^"']+)["']/i)
          if (im) {
            try { icon = new URL(im[1], url).toString() } catch {}
          }
        }
      }
    } catch {}
  }

  if (!icon) icon = getDefaultIcon(url)
  return { title, icon, source }
}

async function startPreview(rawUrl: string, force = false) {
  const url = normalizeUrl(rawUrl)
  if (!url) {
    previewVisible.value = false
    currentPreview.value = null
    return
  }

  previewVisible.value = true
  previewUrl.value = url
  previewIcon.value = getDefaultIcon(url)
  previewName.value = ''
  previewStatusText.value = '⏳ 识别中…'
  previewStatusKind.value = ''

  if (force) currentPreview.value = null
  if (currentPreview.value && currentPreview.value.url === url) {
    applyPreview()
    return
  }

  try {
    const { title, icon, source } = await fetchMeta(url)
    currentPreview.value = { url, title, icon, source }
    applyPreview()
  } catch {
    currentPreview.value = { url, title: '', icon: getDefaultIcon(url), source: 'error' }
    applyPreview()
  }
}

function applyPreview() {
  const p = currentPreview.value
  if (!p) return
  previewIcon.value = p.icon
  previewUrl.value = p.url
  if (p.title) {
    previewName.value = p.title
    const tag = p.source === 'microlink' ? 'Microlink'
              : p.source === 'direct' ? '直连' : ''
    previewStatusText.value = tag ? `✓ ${tag}` : '✓ 已识别'
    previewStatusKind.value = 'ok'
  } else {
    previewName.value = ''
    previewStatusText.value = '✗ 未能自动识别，请手动填写'
    previewStatusKind.value = 'fail'
    setTimeout(() => previewNameRef.value?.focus(), 80)
  }
}

function getItem(id: string | null): BookmarkItem | null {
  if (!id) return null
  return props.items.find(it => it.id === id) || null
}

/* ================================================================
 *  初始化表单 + 焦点
 * ================================================================ */

watch(() => props.modelValue, (open) => {
  if (open) {
    resetForm()
    nextTick(() => focusFirstField())
  }
}, { immediate: true })

function resetForm() {
  formUrl.value = ''
  formName.value = ''
  formIcon.value = ''
  formFolderName.value = ''
  formParentId.value = props.defaultParentId
  currentPreview.value = null
  previewVisible.value = false

  if (props.purpose === 'edit' && props.editingId) {
    const it = getItem(props.editingId)
    if (it) {
      if (it.type === 'bookmark') {
        formName.value = it.name
        formUrl.value = it.url || ''
        formIcon.value = it.icon || ''
        formParentId.value = it.parentId
      } else {
        formName.value = it.name
        formParentId.value = it.parentId
      }
    }
  }
}

function focusFirstField() {
  if (props.purpose === 'edit') {
    formNameRef.value?.select()
    return
  }
  if (props.mode === 'folder') {
    formFolderNameRef.value?.focus()
    return
  }
  formUrlRef.value?.focus()
}

/* ================================================================
 *  关闭 / Esc / 点遮罩
 * ================================================================ */

function close() {
  emit('update:modelValue', false)
}

/* ================================================================
 *  切换添加模式（书签 ↔ 目录）
 * ================================================================ */

function setMode(newMode: ModalMode) {
  if (newMode === props.mode) return
  emit('update:mode', newMode)
  // 切换时清空上一个模式的输入
  formUrl.value = ''
  formFolderName.value = ''
  currentPreview.value = null
  previewVisible.value = false
  nextTick(() => focusFirstField())
}

function onModalMaskClick(e: MouseEvent) {
  if (e.target === modalMaskRef.value) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  if (urlDebounce) clearTimeout(urlDebounce)
})

/* ================================================================
 *  输入处理
 * ================================================================ */

function onUrlInput() {
  if (urlDebounce) clearTimeout(urlDebounce)
  const url = normalizeUrl(formUrl.value)
  if (!url) {
    previewVisible.value = false
    currentPreview.value = null
    return
  }
  if (currentPreview.value && currentPreview.value.url === url) return
  urlDebounce = setTimeout(() => startPreview(url, false), 700)
}

function onUrlKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    submit()
  }
}

function onFolderNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    submit()
  }
}

function onIconInput() {
  previewIcon.value = formIcon.value.trim() || getDefaultIcon(formUrl.value.trim())
}

async function onAutoIdentify() {
  const url = normalizeUrl(formUrl.value)
  if (!url) {
    emit('error', '请先输入正确的网址')
    return
  }
  await startPreview(url, true)
}

async function onReIdentify() {
  const norm = normalizeUrl(formUrl.value.trim())
  if (!norm) {
    emit('error', '请先填写正确的 URL')
    return
  }
  try {
    const { title, icon } = await fetchMeta(norm)
    if (title) formName.value = title
    else {
      formName.value = ''
      nextTick(() => formNameRef.value?.focus())
      emit('error', '自动识别失败，请手动填写名称')
    }
    formUrl.value = norm
    formIcon.value = icon
    previewIcon.value = icon
  } catch {
    emit('error', '识别失败')
  }
}

function onIconError(e: Event, url: string) {
  const img = e.target as HTMLImageElement
  if (img.dataset.fb) return
  img.dataset.fb = '1'
  img.src = getDefaultIcon(url)
}

/* ================================================================
 *  Submit
 * ================================================================ */

async function submit() {
  if (props.purpose === 'edit') {
    submitEdit()
  } else if (props.mode === 'folder') {
    submitAddFolder()
  } else {
    await submitAddBookmark()
  }
}

async function submitAddBookmark() {
  const raw = formUrl.value
  const url = normalizeUrl(raw)
  if (!url) {
    emit('error', '请输入正确的网址（含 http/https）')
    return
  }
  if (!currentPreview.value || currentPreview.value.url !== url) {
    await startPreview(url, false)
  }
  const name = previewName.value.trim()
  if (!name) {
    previewNameRef.value?.focus()
    emit('error', '请填写网站名称')
    return
  }
  let icon = previewIcon.value
  if (!icon || icon === 'data:') icon = getDefaultIcon(url)
  emit('submit', {
    action: 'addBookmark',
    url, name, icon,
    parentId: formParentId.value
  })
  close()
}

function submitAddFolder() {
  const name = formFolderName.value.trim()
  if (!name) {
    emit('error', '请输入目录名')
    return
  }
  emit('submit', {
    action: 'addFolder',
    name,
    parentId: formParentId.value
  })
  close()
}

function submitEdit() {
  const id = props.editingId
  if (!id) { close(); return }
  const it = getItem(id)
  if (!it) { close(); return }

  const parentId = formParentId.value || null

  if (it.type === 'bookmark') {
    const name = formName.value.trim()
    const url = formUrl.value.trim()
    const icon = formIcon.value.trim()
    if (!url) { emit('error', 'URL 不能为空'); return }
    const norm = normalizeUrl(url)
    if (!norm) { emit('error', 'URL 格式不合法'); return }
    emit('submit', {
      action: 'editBookmark',
      id,
      name: name || getDomain(norm),
      url: norm,
      icon: icon || getDefaultIcon(norm),
      parentId
    })
  } else {
    const name = formName.value.trim()
    if (!name) { emit('error', '目录名不能为空'); return }
    if (props.folderSelectDisabledSet.has(parentId)) {
      emit('error', '不能移入自己或子目录')
      return
    }
    emit('submit', {
      action: 'editFolder',
      id, name, parentId
    })
  }
  close()
}

function onDeleteClick() {
  const id = props.editingId
  if (!id) return
  emit('delete', id)
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="bm-fade">
      <div
        v-if="modelValue"
        ref="modalMaskRef"
        class="modal-mask"
        @click="onModalMaskClick"
      >
        <Transition name="bm-dialog">
          <div v-if="modelValue" class="modal" role="dialog" aria-modal="true">
            <!-- 标题栏：左 mac 关闭｜中（标题或占位）｜右 tabs / 占位 -->
            <div class="modal-header">
              <MacWindowControls
                :show-close="true"
                :show-minimize="false"
                :show-maximize="false"
                :clickable="true"
                close-title="关闭"
                @close="close"
              />

              <!-- 添加模式：去掉冗余标题，tabs 直接居中 -->
              <template v-if="purpose === 'add'">
                <div class="modal-tabs">
                  <button
                    type="button"
                    :class="[{ active: mode === 'bookmark' }]"
                    @click="setMode('bookmark')"
                  >添加书签</button>
                  <button
                    type="button"
                    :class="[{ active: mode === 'folder' }]"
                    @click="setMode('folder')"
                  >新建目录</button>
                </div>
              </template>

              <!-- 编辑模式：标题居中 -->
              <template v-else>
                <h3 class="modal-title">
                  {{ editingId && getItem(editingId)?.type === 'bookmark' ? '编辑书签' : '重命名目录' }}
                </h3>
                <div class="w-8"></div>
              </template>
            </div>

            <div class="modal-body">
              <!-- 添加书签 -->
              <template v-if="purpose === 'add' && mode === 'bookmark'">
                <div class="with-button">
                  <input
                    ref="formUrlRef"
                    v-model="formUrl"
                    type="url"
                    placeholder="粘贴或输入网址，例如 https://github.com"
                    spellcheck="false"
                    @input="onUrlInput"
                    @keydown="onUrlKeydown"
                  >
                  <button type="button" class="btn-mono" @click="onAutoIdentify">自动识别</button>
                </div>
                <div :class="['preview', previewVisible ? 'visible' : '']">
                  <img
                    id="modal-preview-icon"
                    :src="previewIcon"
                    alt=""
                    @error="(e) => onIconError(e, previewUrl)"
                  >
                  <div class="meta">
                    <input
                      ref="previewNameRef"
                      v-model="previewName"
                      class="preview-name-input"
                      placeholder="网站名称（识别失败时手动填写）"
                      maxlength="200"
                    >
                    <div class="url" id="modal-preview-url">{{ previewUrl }}</div>
                  </div>
                  <span :class="['status', previewStatusKind]" id="modal-preview-status">{{ previewStatusText }}</span>
                </div>
              </template>

              <!-- 添加目录 -->
              <template v-else-if="purpose === 'add' && mode === 'folder'">
                <input
                  ref="formFolderNameRef"
                  v-model="formFolderName"
                  type="text"
                  placeholder="目录名，例如：开发工具"
                  maxlength="60"
                  spellcheck="false"
                  @keydown="onFolderNameKeydown"
                >
              </template>

              <!-- 编辑书签 -->
              <template v-else-if="purpose === 'edit' && editingId && getItem(editingId)?.type === 'bookmark'">
                <div class="icon-row">
                  <img
                    class="preview-icon"
                    :src="formIcon || getDefaultIcon(formUrl)"
                    :data-url="formUrl"
                    alt=""
                    @error="(e) => onIconError(e, formUrl)"
                  >
                </div>
                <input
                  ref="formNameRef"
                  v-model="formName"
                  type="text"
                  placeholder="名称"
                  maxlength="200"
                  spellcheck="false"
                >
                <input
                  v-model="formUrl"
                  type="url"
                  placeholder="URL"
                  spellcheck="false"
                >
                <input
                  v-model="formIcon"
                  type="url"
                  class="url-mono"
                  placeholder="图标地址"
                  spellcheck="false"
                  @input="onIconInput"
                >
                <div class="with-button">
                  <button type="button" class="btn-mono" style="flex:1" @click="onReIdentify">↻ 重新识别</button>
                </div>
                <div class="parent-select">
                  <label>目录：</label>
                  <select v-model="formParentId">
                    <option value="">📁 根（所有书签）</option>
                    <option
                      v-for="r in folderOptions"
                      :key="r.id"
                      :value="r.id"
                    >{{ '　'.repeat(r.depth) }}📁 {{ r.name }}</option>
                  </select>
                </div>
              </template>

              <!-- 编辑目录 -->
              <template v-else-if="purpose === 'edit' && editingId && getItem(editingId)?.type === 'folder'">
                <input
                  ref="formNameRef"
                  v-model="formName"
                  type="text"
                  placeholder="目录名"
                  maxlength="60"
                  spellcheck="false"
                >
                <div class="parent-select">
                  <label>父目录：</label>
                  <select v-model="formParentId">
                    <option value="">📁 根（所有书签）</option>
                    <option
                      v-for="r in folderOptions"
                      :key="r.id"
                      :value="r.id"
                      :disabled="folderSelectDisabledSet.has(r.id)"
                    >{{ '　'.repeat(r.depth) }}📁 {{ r.name }}</option>
                  </select>
                </div>
              </template>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-mono ghost" @click="close">取消</button>
              <button
                v-if="purpose === 'edit' && editingId"
                type="button"
                class="btn-mono danger"
                @click="onDeleteClick"
              >删除</button>
              <button type="button" class="btn-mono primary" @click="submit">
                {{ purpose === 'edit' ? '保存' : '添加' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景淡入淡出 */
.bm-fade-enter-active,
.bm-fade-leave-active {
  transition: opacity 0.3s ease;
}
.bm-fade-enter-from,
.bm-fade-leave-to {
  opacity: 0;
}

/* 对话框滑入动画 */
.bm-dialog-enter-active,
.bm-dialog-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.bm-dialog-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
.bm-dialog-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

/* Mask */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: #ffffff;
  border: 1px solid #d4cfc4;
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.dark .modal {
  background: #161b22;
  border-color: #30363d;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* Header：左 mac 关闭｜中标题｜右 tabs / 占位 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #ebe7dd;
}
.dark .modal-header {
  border-bottom-color: #30363d;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
  text-align: center;
  margin: 0;
}
.dark .modal-title {
  color: #e6edf3;
}

.modal-tabs {
  display: inline-flex;
  background: #f5f3ee;
  border: 1px solid #d4cfc4;
  border-radius: 6px;
}
.dark .modal-tabs {
  background: #0d1117;
  border-color: #30363d;
}
.modal-tabs button {
  background: transparent;
  border: 0;
  color: #6b7280;
  padding: 7px 16px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  border-radius: 5px;
  transition: all 0.12s;
}
.modal-tabs button.active {
  background: #2563eb;
  color: #fff;
}
.dark .modal-tabs button {
  color: #8b949e;
}
.dark .modal-tabs button.active {
  background: #58a6ff;
  color: #fff;
}

/* Body */
.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-body input[type='url'],
.modal-body input[type='text'] {
  width: 100%;
  background: #ffffff;
  border: 1px solid #d4cfc4;
  color: #1f2937;
  padding: 11px 14px;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.modal-body input:focus {
  border-color: #2563eb;
}
.dark .modal-body input[type='url'],
.dark .modal-body input[type='text'] {
  background: #0d1117;
  border-color: #30363d;
  color: #e6edf3;
}
.dark .modal-body input:focus {
  border-color: #58a6ff;
}

.url-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px !important;
}

.modal-body .with-button {
  display: flex;
  gap: 8px;
}
.modal-body .with-button input {
  flex: 1;
}

/* Preview */
.preview {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f5f3ee;
  border: 1px dashed #d4cfc4;
  border-radius: 6px;
  font-size: 13px;
}
.preview.visible {
  display: flex;
}
.dark .preview {
  background: #0d1117;
  border-color: #30363d;
}
.preview img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #ffffff;
  border: 1px solid #d4cfc4;
  object-fit: contain;
  flex-shrink: 0;
}
.dark .preview img {
  background: #0d1117;
  border-color: #30363d;
}
.preview .meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 4px;
}
.preview .meta .preview-name-input {
  background: #ffffff;
  border: 1px solid #d4cfc4;
  color: #1f2937;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  width: 100%;
  font-family: inherit;
  transition: border-color 0.15s;
}
.preview .meta .preview-name-input:focus {
  border-color: #2563eb;
}
.preview .meta .preview-name-input::placeholder {
  color: #6b7280;
  font-weight: normal;
}
.dark .preview .meta .preview-name-input {
  background: #0d1117;
  border-color: #30363d;
  color: #e6edf3;
}
.dark .preview .meta .preview-name-input:focus {
  border-color: #58a6ff;
}
.dark .preview .meta .preview-name-input::placeholder {
  color: #8b949e;
}
.preview .meta .url {
  color: #6b7280;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dark .preview .meta .url {
  color: #8b949e;
}
.preview .status {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}
.preview .status.ok {
  color: #2da44e;
}
.preview .status.fail {
  color: #d93d3d;
}
.dark .preview .status {
  color: #8b949e;
}
.dark .preview .status.ok {
  color: #3fb950;
}
.dark .preview .status.fail {
  color: #f85149;
}

.parent-select {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}
.dark .parent-select {
  color: #8b949e;
}
.parent-select select {
  flex: 1;
  background: #ffffff;
  border: 1px solid #d4cfc4;
  color: #1f2937;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.dark .parent-select select {
  background: #0d1117;
  border-color: #30363d;
  color: #e6edf3;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-row img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: #f5f3ee;
  border: 1px solid #ebe7dd;
  object-fit: contain;
  flex-shrink: 0;
}
.dark .icon-row img {
  background: #0d1117;
  border-color: #21262d;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 14px 18px;
  border-top: 1px solid #ebe7dd;
}
.dark .modal-footer {
  border-top-color: #30363d;
}
.btn-mono {
  background: #ffffff;
  border: 1px solid #d4cfc4;
  color: #1f2937;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-mono:hover {
  background: #ebe7dd;
}
.dark .btn-mono {
  background: #21262d;
  border-color: #30363d;
  color: #e6edf3;
}
.dark .btn-mono:hover {
  background: #30363d;
}
.btn-mono.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  font-weight: 500;
}
.btn-mono.primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
.btn-mono.danger {
  background: transparent;
  border-color: #d93d3d;
  color: #d93d3d;
}
.btn-mono.danger:hover {
  background: rgba(217, 61, 61, 0.1);
}
.btn-mono.ghost {
  background: transparent;
}
.dark .btn-mono.primary {
  background: #58a6ff;
  border-color: #58a6ff;
}
.dark .btn-mono.primary:hover {
  background: #79b8ff;
  border-color: #79b8ff;
}
.dark .btn-mono.danger {
  border-color: #f85149;
  color: #f85149;
}
.dark .btn-mono.danger:hover {
  background: rgba(248, 81, 73, 0.1);
}
</style>
