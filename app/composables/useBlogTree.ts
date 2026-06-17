import type { TreeItem } from '~~/shared/types'
import { api } from './useApi'

// 模块级缓存，整个应用共享一份
let cachedTree: TreeItem[] | null = null
let fetchPromise: Promise<TreeItem[]> | null = null

export function useBlogTree() {
  const tree = ref<TreeItem[]>(cachedTree ?? [])
  const loading = ref(!cachedTree)
  const error = ref(false)
  const flatFiles = computed(() => {
    const result: { name: string; path: string; depth: number }[] = []
    function walk(items: TreeItem[], depth: number) {
      for (const item of items) {
        if (item.type === 'file') {
          result.push({ name: item.name, path: item.path, depth })
        }
        if (item.children) walk(item.children, depth + 1)
      }
    }
    walk(tree.value, 0)
    return result
  })

  async function fetchTree() {
    if (cachedTree) {
      tree.value = cachedTree
      loading.value = false
      return
    }
    if (fetchPromise && !error.value) {
      tree.value = await fetchPromise
      loading.value = false
      return
    }

    loading.value = true
    error.value = false
    fetchPromise = api('/api/proxy/raw', {
      query: { url: '/md/index.json' },
    }).then((data: unknown) => {
      const parsed = JSON.parse(data as string) as TreeItem[]
      cachedTree = parsed
      return parsed
    })

    try {
      tree.value = await fetchPromise
    } catch {
      error.value = true
      fetchPromise = null
    } finally {
      loading.value = false
    }
  }

  return { tree, flatFiles, loading, error, fetchTree }
}
