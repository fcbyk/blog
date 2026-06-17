import { type EditorPage } from '@shared/types'

export const useEditorStore = defineStore('editor', () => {
  const activePage = ref<EditorPage>('base')

  function setActivePage(page: EditorPage) {
    activePage.value = page
  }

  function resetPage() {
    activePage.value = 'base'
  }

  return {
    activePage,
    setActivePage,
    resetPage
  }
})
