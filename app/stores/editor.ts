import type { Datas } from '~~/shared/types/data'
import { type EditorPage } from '~~/shared/types'
import { DEFAULT_CONFIG } from '~~/shared/defaultConfig'

const EDITOR_STORAGE_KEY = 'editor-saved-data'

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const useEditorStore = defineStore('editor', () => {
  const activePage = ref<EditorPage>('base')
  const editorDatas = ref<Datas | null>(null)
  const isReady = ref(false)
  const showImportPopup = ref(false)

  function setActivePage(page: EditorPage) {
    activePage.value = page
  }

  function resetPage() {
    activePage.value = 'base'
  }

  function setDatas(data: Datas) {
    editorDatas.value = data
    isReady.value = true
  }

  function resetDatas() {
    editorDatas.value = null
    isReady.value = false
  }

  function openImportPopup() {
    showImportPopup.value = true
  }

  function closeImportPopup() {
    showImportPopup.value = false
  }

  // 清空所有编辑器数据，恢复默认配置
  function clearAllData(): boolean {
    try {
      editorDatas.value = deepClone(DEFAULT_CONFIG)
      localStorage.removeItem(EDITOR_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }

  // 导出所有数据为 zip 并触发下载
  async function exportAllData(): Promise<boolean> {
    const datas = editorDatas.value
    if (!datas) return false

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      const files: Record<string, any> = {
        'base.json': datas.baseConfig,
        'keyword.json': datas.keywordReplies,
        'regex.json': datas.regexReplies,
        'url.json': datas.urlTriggers,
      }

      for (const [name, content] of Object.entries(files)) {
        zip.file(name, JSON.stringify(content, null, 2))
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'blog-config.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return true
    } catch {
      return false
    }
  }

  return {
    activePage,
    editorDatas,
    isReady,
    showImportPopup,
    setActivePage,
    resetPage,
    setDatas,
    resetDatas,
    openImportPopup,
    closeImportPopup,
    clearAllData,
    exportAllData,
  }
})
