import type { Datas } from '~~/shared/types/data'

const STORAGE_KEY = 'editor-data-cache'

type DataKey = 'baseConfig' | 'keywordReplies' | 'regexReplies' | 'urlTriggers'

const DATA_KEY_META: Record<DataKey, { label: string; filename: string; validate: (data: any) => boolean }> = {
  baseConfig: {
    label: '基础设置',
    filename: 'base.json',
    validate: (d) => typeof d === 'object' && d !== null && ('helloMsg' in d || 'avatar' in d || 'menu' in d)
  },
  keywordReplies: {
    label: '关键词回复',
    filename: 'keyword.json',
    validate: (d) => typeof d === 'object' && d !== null && !Array.isArray(d)
  },
  regexReplies: {
    label: '正则回复',
    filename: 'regex.json',
    validate: (d) => Array.isArray(d)
  },
  urlTriggers: {
    label: 'URL 触发',
    filename: 'url.json',
    validate: (d) => typeof d === 'object' && d !== null
  }
}

export function useEditorDataManager() {
  const editorStore = useEditorStore()

  // ─── sessionStorage 缓存 ───

  const loadFromCache = (): Datas | null => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (!cached) return null
      return JSON.parse(cached) as Datas
    } catch {
      return null
    }
  }

  const saveToCache = (data: Datas) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }

  // ─── 从主应用 appStore 加载数据 ───

  function loadFromApp(): Datas | null {
    const appStore = useAppStore()
    return appStore.isReady && appStore.datas ? appStore.datas : null
  }

  // ─── 更新方法 ───

  function updateBaseConfig(data: Partial<Datas['baseConfig']>) {
    const current = editorStore.editorDatas?.baseConfig
    if (!current || !editorStore.editorDatas) throw new Error('当前数据不存在')

    const merged = { ...current, ...data }
    const updated: Datas = { ...editorStore.editorDatas, baseConfig: merged }
    editorStore.setDatas(updated)
    saveToCache(updated)
    return merged
  }

  function updateKeywordReplies(data: Datas['keywordReplies']) {
    if (!editorStore.editorDatas) throw new Error('当前数据不存在')

    const updated: Datas = { ...editorStore.editorDatas, keywordReplies: data }
    editorStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  function updateRegexReplies(data: Datas['regexReplies']) {
    if (!editorStore.editorDatas) throw new Error('当前数据不存在')

    const updated: Datas = { ...editorStore.editorDatas, regexReplies: data }
    editorStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  function updateUrlTriggers(data: Datas['urlTriggers']) {
    if (!editorStore.editorDatas) throw new Error('当前数据不存在')

    const updated: Datas = { ...editorStore.editorDatas, urlTriggers: data }
    editorStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  // ─── 文件导入 ───

  function readJsonFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          resolve(JSON.parse(text))
        } catch {
          reject(new Error(`文件 ${file.name} 不是有效的 JSON`))
        }
      }
      reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`))
      reader.readAsText(file)
    })
  }

  function detectDataKey(data: unknown): DataKey | null {
    if (typeof data !== 'object' || data === null) return null
    for (const [key, meta] of Object.entries(DATA_KEY_META)) {
      if (meta.validate(data)) return key as DataKey
    }
    return null
  }

  async function importDataFile(file: File, key?: DataKey): Promise<{ success: boolean; message: string }> {
    try {
      const data = await readJsonFile(file)
      const targetKey = key ?? detectDataKey(data)

      if (!targetKey) {
        return { success: false, message: `无法识别文件 "${file.name}" 的数据类型` }
      }

      switch (targetKey) {
        case 'baseConfig': updateBaseConfig(data as Datas['baseConfig']); break
        case 'keywordReplies': updateKeywordReplies(data as Datas['keywordReplies']); break
        case 'regexReplies': updateRegexReplies(data as Datas['regexReplies']); break
        case 'urlTriggers': updateUrlTriggers(data as Datas['urlTriggers']); break
      }

      return { success: true, message: `已导入 ${DATA_KEY_META[targetKey].label}（${file.name}）` }
    } catch (err: any) {
      return { success: false, message: err.message ?? '导入失败' }
    }
  }

  // ─── 文件导出 ───

  function exportDataFile(data: unknown, filename: string) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportBaseConfig() { if (editorStore.editorDatas) exportDataFile(editorStore.editorDatas.baseConfig, 'base.json') }
  function exportKeywordReplies() { if (editorStore.editorDatas) exportDataFile(editorStore.editorDatas.keywordReplies, 'keyword.json') }
  function exportRegexReplies() { if (editorStore.editorDatas) exportDataFile(editorStore.editorDatas.regexReplies, 'regex.json') }
  function exportUrlTriggers() { if (editorStore.editorDatas) exportDataFile(editorStore.editorDatas.urlTriggers, 'url.json') }

  // ─── 源码编辑 ───

  function applyJsonEdit(key: DataKey, jsonText: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonText)
      switch (key) {
        case 'baseConfig': updateBaseConfig(parsed); break
        case 'keywordReplies': updateKeywordReplies(parsed); break
        case 'regexReplies': updateRegexReplies(parsed); break
        case 'urlTriggers': updateUrlTriggers(parsed); break
      }
      return { success: true, message: '已应用更改' }
    } catch (err: any) {
      return { success: false, message: `JSON 解析错误：${err.message}` }
    }
  }

  function getDataByKey(key: DataKey) {
    if (!editorStore.editorDatas) return null
    return editorStore.editorDatas[key]
  }

  return {
    loadFromApp,
    loadFromCache,
    updateBaseConfig,
    updateKeywordReplies,
    updateRegexReplies,
    updateUrlTriggers,
    importDataFile,
    exportBaseConfig,
    exportKeywordReplies,
    exportRegexReplies,
    exportUrlTriggers,
    applyJsonEdit,
    getDataByKey,
    DATA_KEY_META
  }
}
