export const useNavStore = defineStore('nav', () => {
  const editMode = ref(false)
  const localDataEnabled = ref(false)

  function toggleEdit() {
    editMode.value = !editMode.value
  }

  function setEditMode(on: boolean) {
    editMode.value = !!on
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