import { type EditorPage } from '~~/shared/types'

export const useEditorStore = defineStore('editor', () => {
  // 当前激活的页面
  const activePage = ref<EditorPage>('base')

  // 设置当前页面
  function setActivePage(page: EditorPage) {
    activePage.value = page
  }

  // 重置到默认页面
  function resetPage() {
    activePage.value = 'base'
  }

  return {
    activePage,
    setActivePage,
    resetPage
  }
})
