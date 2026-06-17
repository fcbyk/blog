import type { Datas } from '@shared/types/data'
import { api, ApiTimeoutError } from './useApi'
import { useAppStore } from '../stores/app'

const STORAGE_KEY = 'app-data-cache'

/** Koa API response wrapper */
interface ApiResponse<T> {
  success: boolean
  data: T
  exists?: boolean
}

export function useAppDataManager() {
  const appStore = useAppStore()

  const loadFromCache = (): Datas | null => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (!cached) return null
      const data = JSON.parse(cached)
      return data as Datas
    } catch (error) {
      console.error('加载缓存失败:', error)
      return null
    }
  }

  const saveToCache = (data: Datas) => {
    try {
      const cacheData = {
        ...data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  const clearCache = () => {
    sessionStorage.removeItem(STORAGE_KEY)
  }

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
      // 并行从各独立端点加载配置
      const [baseConfigRes, keywordRes, regexRes, urlRes] = await Promise.all([
        api.get<ApiResponse<{
          helloMsg: Datas['baseConfig']['helloMsg']
          avatar: Datas['baseConfig']['avatar']
          menu: Datas['baseConfig']['menu']
        }>>('/api/base-config'),
        api.get<ApiResponse<Datas['keywordReplies']>>('/api/keyword-reply-config'),
        api.get<ApiResponse<Datas['regexReplies']>>('/api/regex-reply-config'),
        api.get<ApiResponse<Datas['urlTriggers']>>('/api/url-trigger-config')
      ])

      const datas: Datas = {
        baseConfig: baseConfigRes.data,
        keywordReplies: keywordRes.data,
        regexReplies: regexRes.data,
        urlTriggers: urlRes.data
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

  // ─── 各配置独立保存 ───

  async function updateBaseConfig(data: Partial<Datas['baseConfig']>) {
    const current = appStore.datas?.baseConfig
    if (!current || !appStore.datas) throw new Error('当前数据不存在')

    const merged = { ...current, ...data }
    await api.post('/api/base-config', merged)

    const updated: Datas = { ...appStore.datas, baseConfig: merged }
    appStore.setDatas(updated)
    saveToCache(updated)
    return merged
  }

  async function updateKeywordReplies(data: Datas['keywordReplies']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    await api.post('/api/keyword-reply-config', data)

    const updated: Datas = { ...appStore.datas, keywordReplies: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  async function updateRegexReplies(data: Datas['regexReplies']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    await api.post('/api/regex-reply-config', data)

    const updated: Datas = { ...appStore.datas, regexReplies: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  async function updateUrlTriggers(data: Datas['urlTriggers']) {
    if (!appStore.datas) throw new Error('当前数据不存在')

    await api.post('/api/url-trigger-config', data)

    const updated: Datas = { ...appStore.datas, urlTriggers: data }
    appStore.setDatas(updated)
    saveToCache(updated)
    return data
  }

  return {
    initDatas,
    updateBaseConfig,
    updateKeywordReplies,
    updateRegexReplies,
    updateUrlTriggers,
    clearCache
  }
}
