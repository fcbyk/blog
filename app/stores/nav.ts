export const useNavStore = defineStore('nav', () => {
  const EDIT_MODE_KEY = 'nav_edit_mode'
  const SOURCE_MODE_KEY = 'nav_source_mode'

  function loadEditMode(): boolean {
    try {
      if (typeof window === 'undefined') return false
      return localStorage.getItem(EDIT_MODE_KEY) === '1'
    } catch { return false }
  }

  function loadSourceMode(): boolean {
    try {
      if (typeof window === 'undefined') return false
      return localStorage.getItem(SOURCE_MODE_KEY) === '1'
    } catch { return false }
  }

  const editMode = ref(loadEditMode())
  const sourceMode = ref(loadSourceMode())
  const localDataEnabled = ref(false)

  function toggleEdit() {
    editMode.value = !editMode.value
    try { localStorage.setItem(EDIT_MODE_KEY, editMode.value ? '1' : '0') } catch {}
  }

  function setEditMode(on: boolean) {
    editMode.value = !!on
    try { localStorage.setItem(EDIT_MODE_KEY, on ? '1' : '0') } catch {}
  }

  function toggleSourceMode() {
    sourceMode.value = !sourceMode.value
    try { localStorage.setItem(SOURCE_MODE_KEY, sourceMode.value ? '1' : '0') } catch {}
  }

  function setSourceMode(on: boolean) {
    sourceMode.value = !!on
    try { localStorage.setItem(SOURCE_MODE_KEY, on ? '1' : '0') } catch {}
  }

  /* 退出登录时调用：重置编辑/源码模式（内存 + 本地存储），下次进入 nav 路由即恢复默认 */
  function resetModes() {
    editMode.value = false
    sourceMode.value = false
    try { localStorage.setItem(EDIT_MODE_KEY, '0') } catch {}
    try { localStorage.setItem(SOURCE_MODE_KEY, '0') } catch {}
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
    sourceMode,
    toggleSourceMode,
    setSourceMode,
    resetModes,
    localDataEnabled,
    toggleLocalData,
    setLocalDataEnabled,
    dispatch,
  }
})
