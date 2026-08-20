export const useNavStore = defineStore('nav', () => {
  const EDIT_MODE_KEY = 'nav_edit_mode'

  function loadEditMode(): boolean {
    try {
      if (typeof window === 'undefined') return false
      return localStorage.getItem(EDIT_MODE_KEY) === '1'
    } catch { return false }
  }

  const editMode = ref(loadEditMode())
  const localDataEnabled = ref(false)

  function toggleEdit() {
    editMode.value = !editMode.value
    try { localStorage.setItem(EDIT_MODE_KEY, editMode.value ? '1' : '0') } catch {}
  }

  function setEditMode(on: boolean) {
    editMode.value = !!on
    try { localStorage.setItem(EDIT_MODE_KEY, on ? '1' : '0') } catch {}
  }

  function toggleLocalData() {
    localDataEnabled.value = !localDataEnabled.value
  }

  function setLocalDataEnabled(on: boolean) {
    localDataEnabled.value = !!on
  }

  /**
   * 派发 nav 命令（实际逻辑由当前活动的 /nav 页面监听 'nav-cmd' 事件执行）
   */
  function dispatch(cmd: 'import' | 'export' | 'clear' | 'toggleLocal') {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nav-cmd', { detail: { cmd } }))
  }

  return {
    editMode,
    toggleEdit,
    setEditMode,
    localDataEnabled,
    toggleLocalData,
    setLocalDataEnabled,
    dispatch,
  }
})