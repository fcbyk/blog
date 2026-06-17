import type { Datas } from '~~/shared/types/data'
import { api, ApiTimeoutError } from './useApi'

const STORAGE_KEY = 'app-data-cache'

const CHAT_FILES = ['base.json', 'keyword.json', 'regex.json', 'url.json'] as const

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

  // ========== 数据加载 ==========

  async function initDatas(forceRefresh = false) {
    if (appStore.isReady && !forceRefresh) return

    if (!forceRefresh) {
      const cached = loadFromCache()
      if (cached) {
        appStore.setDatas(cached)
        return
      }
    }

    appStore.setLoading(true)

    try {
      const [baseRes, keywordRes, regexRes, urlRes] = await Promise.all([
        api<string>(`/api/proxy/raw`, { query: { url: '/chat/base.json' } }),
        api<string>(`/api/proxy/raw`, { query: { url: '/chat/keyword.json' } }),
        api<string>(`/api/proxy/raw`, { query: { url: '/chat/regex.json' } }),
        api<string>(`/api/proxy/raw`, { query: { url: '/chat/url.json' } }),
      ])

      const datas: Datas = {
        baseConfig: JSON.parse(baseRes),
        keywordReplies: JSON.parse(keywordRes),
        regexReplies: JSON.parse(regexRes),
        urlTriggers: JSON.parse(urlRes),
      }

      appStore.setDatas(datas)
      saveToCache(datas)
    } catch (err) {
      if (err instanceof ApiTimeoutError) {
        console.error('加载配置超时:', err.message)
      } else {
        console.error('Failed to load app datas:', err)
      }
      appStore.setError()

      if (!appStore.isReady) {
        const cached = loadFromCache()
        if (cached) {
          appStore.setDatas(cached)
        }
      }
    } finally {
      appStore.setLoading(false)
    }
  }

  return {
    initDatas,
  }
}
