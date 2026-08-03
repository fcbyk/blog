import type { Datas } from '@shared/types/data'
import { DEFAULT_CONFIG } from '@shared/defaultConfig'
import { useAppStore } from '../stores/app'

const STORAGE_KEY = 'app-data-cache'

/** 各 JSON 文件对应的数据类型键名（用于导入检测） */
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

export function useAppDataManager() {
  const appStore = useAppStore()

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
    } catch {
      // sessionStorage 满了或不可用，忽略
    }
  }

  const clearCache = () => {
    sessionStorage.removeItem(STORAGE_KEY)
  }

  // ─── 初始化 ───

  function initDatas(forceRefresh = false) {
    if (appStore.isReady && !forceRefresh) return

    if (!forceRefresh) {
      const cached = loadFromCache()
      if (cached) {
        appStore.setDatas(cached)
        return
      }
    }

    // 无缓存时使用默认空结构
    appStore.setLoading(true)
    appStore.setDatas(DEFAULT_CONFIG)
    saveToCache(DEFAULT_CONFIG)
    appStore.setLoading(false)
  }

  // ─── 更新方法（只操作 store + sessionStorage，无后端） ───

  function updateBaseConfig(data: Partial<Datas['baseConfig']>) {
    const current = appStore.datas?.baseConfig
    if (!current || !appStore.datas) throw new Error('当前数据不存在')

    const merged = { ...current, ...data }
    const updated: Datas = { ...appStore.datas, baseConfig: merged }
    appStore.setDatas(updated)
    saveToCache(updated)
    return merged
  }

  function updateKeywordReplies(data: Datas['keywordReplies']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    const updated: Datas = { ...appStore.datas, keywordReplies: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  function updateRegexReplies(data: Datas['regexReplies']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    const updated: Datas = { ...appStore.datas, regexReplies: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  function updateUrlTriggers(data: Datas['urlTriggers']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    const updated: Datas = { ...appStore.datas, urlTriggers: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  // ─── 文件导入 ───

  /** 从用户选择的文件中读取 JSON */
  function readJsonFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const data = JSON.parse(text)
          resolve(data)
        } catch {
          reject(new Error(`文件 ${file.name} 不是有效的 JSON`))
        }
      }
      reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`))
      reader.readAsText(file)
    })
  }

  /** 智能检测导入的 JSON 属于哪个数据分区 */
  function detectDataKey(data: unknown): DataKey | null {
    if (typeof data !== 'object' || data === null) return null
    for (const [key, meta] of Object.entries(DATA_KEY_META)) {
      if (meta.validate(data)) return key as DataKey
    }
    return null
  }

  /** 导入 JSON 文件到指定数据分区 */
  async function importDataFile(file: File, key?: DataKey): Promise<{ success: boolean; message: string }> {
    try {
      const data = await readJsonFile(file)
      const targetKey = key ?? detectDataKey(data)

      if (!targetKey) {
        return { success: false, message: `无法识别文件 "${file.name}" 的数据类型，请确认 JSON 结构正确` }
      }

      switch (targetKey) {
        case 'baseConfig':
          updateBaseConfig(data as Datas['baseConfig'])
          break
        case 'keywordReplies':
          updateKeywordReplies(data as Datas['keywordReplies'])
          break
        case 'regexReplies':
          updateRegexReplies(data as Datas['regexReplies'])
          break
        case 'urlTriggers':
          updateUrlTriggers(data as Datas['urlTriggers'])
          break
      }

      return { success: true, message: `已导入 ${DATA_KEY_META[targetKey].label}（${file.name}）` }
    } catch (err: any) {
      return { success: false, message: err.message ?? '导入失败' }
    }
  }

  // ─── 文件导出 ───

  /** 导出数据为 JSON 文件下载 */
  function exportDataFile(data: unknown, filename: string) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportBaseConfig() {
    if (!appStore.datas) return
    exportDataFile(appStore.datas.baseConfig, 'base.json')
  }

  function exportKeywordReplies() {
    if (!appStore.datas) return
    exportDataFile(appStore.datas.keywordReplies, 'keyword.json')
  }

  function exportRegexReplies() {
    if (!appStore.datas) return
    exportDataFile(appStore.datas.regexReplies, 'regex.json')
  }

  function exportUrlTriggers() {
    if (!appStore.datas) return
    exportDataFile(appStore.datas.urlTriggers, 'url.json')
  }

  // ─── 获取当前数据（用于外部） ───

  function getDataByKey(key: DataKey) {
    if (!appStore.datas) return null
    return appStore.datas[key]
  }

  // ─── 源码编辑：从 JSON 文本应用更改 ───

  function applyJsonEdit(key: DataKey, jsonText: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonText)
      switch (key) {
        case 'baseConfig':
          updateBaseConfig(parsed)
          break
        case 'keywordReplies':
          updateKeywordReplies(parsed)
          break
        case 'regexReplies':
          updateRegexReplies(parsed)
          break
        case 'urlTriggers':
          updateUrlTriggers(parsed)
          break
      }
      return { success: true, message: '已应用更改' }
    } catch (err: any) {
      return { success: false, message: `JSON 解析错误：${err.message}` }
    }
  }

  return {
    // 初始化
    initDatas,
    clearCache,
    // 更新
    updateBaseConfig,
    updateKeywordReplies,
    updateRegexReplies,
    updateUrlTriggers,
    // 导入
    importDataFile,
    // 导出
    exportBaseConfig,
    exportKeywordReplies,
    exportRegexReplies,
    exportUrlTriggers,
    // 源码编辑
    applyJsonEdit,
    // 工具
    getDataByKey,
    DATA_KEY_META
  }
}
