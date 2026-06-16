import type { Datas, DocumentId } from '~~/shared/types/database'
import { DOCUMENT_IDS } from '~~/shared/types/database'
import { api, ApiTimeoutError } from './useApi'

const STORAGE_KEY = 'app-data-cache'

export function useAppDataManager() {
  const appStore = useAppStore()

  // ========== 缓存操作 ==========
  
  const loadFromCache = (): Datas | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (!cached) return null
      const data = JSON.parse(cached)
      console.log('从缓存加载应用数据')
      return data as Datas
    } catch (error) {
      console.error('加载缓存失败:', error)
      return null
    }
  }

  const saveToCache = (data: Datas) => {
    if (typeof window === 'undefined') return
    
    try {
      const cacheData = {
        ...data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData))
      console.log('应用数据已缓存')
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  const clearCache = () => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(STORAGE_KEY)
  }

  // ========== 数据加载 ==========
  
  async function initDatas(forceRefresh = false) {
    // 如果已经就绪且不强制刷新，直接返回
    if (appStore.isReady && !forceRefresh) return
    
    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = loadFromCache()
      if (cached) {
        appStore.setDatas(cached)
        return
      }
    }

    appStore.setLoading(true)
    
    try {
      const res = await api<Datas>('/api/config/all')
      appStore.setDatas(res)
      
      // 保存到缓存
      saveToCache(res)
    } catch (err) {
      if (err instanceof ApiTimeoutError) {
        console.error('加载配置超时:', err.message)
      } else {
        console.error('Failed to load app datas:', err)
      }
      appStore.setError()
      
      // 失败时尝试用缓存兜底
      if (!appStore.isReady) {
        const cached = loadFromCache()
        if (cached) {
          appStore.setDatas(cached)
        }
        // 缓存也没有时保持错误状态，由 UI 展示错误并提供重试
      }
    } finally {
      appStore.setLoading(false)
    }
  }

  // ========== 数据更新 ==========
  
  async function updateConfig<T extends keyof Datas>(
    id: DocumentId, 
    field: T,
    data: Partial<Datas[T]>
  ): Promise<Datas[T] | null> {
    try {
      // 1. 获取当前完整数据
      const currentData = appStore.datas?.[field]
      if (!currentData || !appStore.datas) {
        throw new Error('当前数据不存在')
      }
      
      // 2. 合并数据：保留现有字段，只更新传入的字段
      const mergedData = {
        ...currentData,
        ...data
      }
      
      // 3. 调用 API（发送完整数据）
      const result = await api<Datas[T]>(`/api/config/${id}`, {
        method: 'PUT',
        body: mergedData,
        headers: getAuthHeader()
      })
      
      // 4. 更新 Store
      const updatedDatas: Datas = {
        ...appStore.datas,
        [field]: mergedData
      }
      
      appStore.setDatas(updatedDatas)
      
      // 5. 更新缓存
      saveToCache(updatedDatas)
      
      return result
    } catch (error) {
      console.error(`更新配置失败 ${id}:`, error)
      throw error
    }
  }
  
  async function updateBaseConfig(data: Partial<Datas['baseConfig']>) {
    return updateConfig(DOCUMENT_IDS.BASE_CONFIG, 'baseConfig', data)
  }
  
  async function updateKeywordReplies(data: Partial<Datas['keywordReplies']>) {
    return updateConfig(DOCUMENT_IDS.KEYWORD_REPLY, 'keywordReplies', data)
  }
  
  async function updateRegexReplies(data: Partial<Datas['regexReplies']>) {
    return updateConfig(DOCUMENT_IDS.REGEX_REPLY, 'regexReplies', data)
  }
  
  async function updateUrlTriggers(data: Partial<Datas['urlTriggers']>) {
    return updateConfig(DOCUMENT_IDS.URL_TRIGGER, 'urlTriggers', data)
  }

  return {
    // 初始化
    initDatas,
    
    // 更新方法
    updateBaseConfig,
    updateKeywordReplies,
    updateRegexReplies,
    updateUrlTriggers,
    
    // 缓存管理（可选暴露）
    clearCache
  }
}