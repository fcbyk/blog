import type { Datas } from '~~/shared/types/data'

export const useAppStore = defineStore('app', () => {
  const datas = ref<Datas | null>(null)
  const loading = ref(false)
  const isReady = ref(false)
  const isError = ref(false)

  function setDatas(data: Datas) {
    datas.value = data
    isReady.value = true
    isError.value = false
  }

  function setLoading(status: boolean) {
    loading.value = status
  }

  function setError(status = true) {
    isError.value = status
    if (status) loading.value = false
  }

  function reset() {
    datas.value = null
    loading.value = false
    isReady.value = false
    isError.value = false
  }

  return {
    datas,
    loading,
    isReady,
    isError,
    setDatas,
    setLoading,
    setError,
    reset
  }
})