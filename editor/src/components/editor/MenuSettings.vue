<script setup lang="ts">
import type { ActionMenuItem, ActionMenu } from '@shared/types/menu'

const appStore = useAppStore()
const appDataManager = useAppDataManager()

const menuItems = ref<ActionMenu>([])

const showEditor = ref(false)
const editingIndex = ref<number | null>(null)
const isAddingChild = ref(false)
const parentIndex = ref<number | null>(null)

const showEditNameDialog = ref(false)
const editingNameIndex = ref<number | null>(null)
const editingNameIsChild = ref(false)
const editingNameParentIndex = ref<number | null>(null)
const newMenuName = ref('')

const showAddDialog = ref(false)
const newMenuLabel = ref('')
const addingAsChild = ref(false)
const addChildParentIndex = ref<number | null>(null)

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const isDirty = ref(false)
const showHelp = ref(false)
let saveTimer: number | null = null
let messageTimer: number | null = null

const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const draggingChildIndex = ref<{parentIndex: number, childIndex: number} | null>(null)
const dragOverChildIndex = ref<{parentIndex: number, childIndex: number} | null>(null)

async function fetchConfig() {
  loading.value = true
  try {
    const data = appStore.datas?.baseConfig
    if (data) {
      menuItems.value = data.menu || []
      isDirty.value = false
    } else {
      menuItems.value = []
    }
  } catch (error) {
    console.error('Failed to fetch config:', error)
    menuItems.value = []
    showMessage('获取配置失败', 'error')
  } finally {
    loading.value = false
  }
}

function handleDragStart(index: number) { draggingIndex.value = index }
function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (draggingIndex.value === null || draggingIndex.value === index) return
  dragOverIndex.value = index
}
function handleDragLeave() { dragOverIndex.value = null }
function handleDrop(targetIndex: number) {
  if (draggingIndex.value === null || draggingIndex.value === targetIndex) {
    draggingIndex.value = null; dragOverIndex.value = null; return
  }
  const draggedItem = menuItems.value[draggingIndex.value]
  if (!draggedItem) { draggingIndex.value = null; dragOverIndex.value = null; return }
  menuItems.value.splice(draggingIndex.value, 1)
  menuItems.value.splice(targetIndex, 0, draggedItem)
  draggingIndex.value = null; dragOverIndex.value = null
  autoSave(); showMessage('菜单顺序已更新', 'success')
}
function handleDragEnd() { draggingIndex.value = null; dragOverIndex.value = null }

function handleChildDragStart(parentIndex: number, childIndex: number) {
  draggingChildIndex.value = { parentIndex, childIndex }
}
function handleChildDragOver(event: DragEvent, parentIndex: number, childIndex: number) {
  event.preventDefault()
  if (!draggingChildIndex.value) return
  if (draggingChildIndex.value.parentIndex !== parentIndex) return
  if (draggingChildIndex.value.childIndex === childIndex) return
  dragOverChildIndex.value = { parentIndex, childIndex }
}
function handleChildDragLeave() { dragOverChildIndex.value = null }
function handleChildDrop(parentIndex: number, targetChildIndex: number) {
  if (!draggingChildIndex.value) { draggingChildIndex.value = null; dragOverChildIndex.value = null; return }
  const { parentIndex: sourceParentIndex, childIndex: sourceChildIndex } = draggingChildIndex.value
  if (sourceParentIndex !== parentIndex) { draggingChildIndex.value = null; dragOverChildIndex.value = null; return }
  if (sourceChildIndex === targetChildIndex) { draggingChildIndex.value = null; dragOverChildIndex.value = null; return }
  const parent = menuItems.value[parentIndex] as any
  if (!parent.child || !Array.isArray(parent.child)) { draggingChildIndex.value = null; dragOverChildIndex.value = null; return }
  const draggedChild = parent.child[sourceChildIndex]
  if (!draggedChild) { draggingChildIndex.value = null; dragOverChildIndex.value = null; return }
  parent.child.splice(sourceChildIndex, 1)
  parent.child.splice(targetChildIndex, 0, draggedChild)
  draggingChildIndex.value = null; dragOverChildIndex.value = null
  autoSave(); showMessage('子菜单顺序已更新', 'success')
}
function handleChildDragEnd() { draggingChildIndex.value = null; dragOverChildIndex.value = null }

function autoSave() {
  isDirty.value = true
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => { await performSave() }, 500)
}

async function performSave() {
  if (!isDirty.value) return
  saving.value = true
  try {
    await appDataManager.updateBaseConfig({ menu: menuItems.value })
    isDirty.value = false
    showMessage('保存成功', 'success')
  } catch (error: any) {
    console.error('Failed to save config:', error)
    showMessage(error.message || '保存失败', 'error')
  } finally {
    saving.value = false; saveTimer = null
  }
}

function addMenuItem() {
  newMenuLabel.value = ''; addingAsChild.value = false; addChildParentIndex.value = null; showAddDialog.value = true
}
function confirmAddMenuItem() {
  const label = newMenuLabel.value.trim()
  if (!label) { showMessage('请输入菜单标签', 'error'); return }
  menuItems.value.push({ label, messages: [] })
  autoSave(); showAddDialog.value = false; newMenuLabel.value = ''
}
function cancelAddMenuItem() { showAddDialog.value = false; newMenuLabel.value = '' }

function openEditNameDialog(index: number) {
  editingNameIndex.value = index; editingNameIsChild.value = false; editingNameParentIndex.value = null
  const item = menuItems.value[index]; if (item) newMenuName.value = item.label
  showEditNameDialog.value = true
}
function openEditChildNameDialog(parentIdx: number, childIdx: number) {
  editingNameIndex.value = childIdx; editingNameIsChild.value = true; editingNameParentIndex.value = parentIdx
  const parent = menuItems.value[parentIdx] as any
  if ('child' in parent && parent.child && parent.child[childIdx]) newMenuName.value = parent.child[childIdx].label
  showEditNameDialog.value = true
}
function confirmEditName() {
  const name = newMenuName.value.trim()
  if (!name) { showMessage('请输入菜单名称', 'error'); return }
  if (editingNameIsChild.value && editingNameParentIndex.value !== null) {
    const parent = menuItems.value[editingNameParentIndex.value] as any
    if ('child' in parent && parent.child && parent.child[editingNameIndex.value!]) parent.child[editingNameIndex.value!].label = name
  } else if (editingNameIndex.value !== null) {
    const item = menuItems.value[editingNameIndex.value]; if (item) item.label = name
  }
  autoSave(); showEditNameDialog.value = false
}
function cancelEditName() { showEditNameDialog.value = false; newMenuName.value = '' }

function editMenuItem(index: number) {
  editingIndex.value = index; isAddingChild.value = false; parentIndex.value = null; showEditor.value = true
}
function convertToGroup(index: number) {
  if (confirm('转换为分组菜单后，现有的消息将被清空。确定要转换吗？')) {
    const item = menuItems.value[index] as any; delete item.messages; item.child = []; autoSave()
  }
}
function convertToFlat(index: number) {
  if (confirm('转换为扁平菜单后，现有的子菜单将被清空。确定要转换吗？')) {
    const item = menuItems.value[index] as any; delete item.child; item.messages = []; autoSave()
  }
}
function deleteMenuItem(index: number) {
  if (confirm('确定要删除这个菜单项吗？')) { menuItems.value.splice(index, 1); autoSave() }
}

function addChildItem(parentIdx: number) {
  newMenuLabel.value = ''; addingAsChild.value = true; addChildParentIndex.value = parentIdx; showAddDialog.value = true
}
function confirmAddChildItem() {
  const label = newMenuLabel.value.trim()
  if (!label) { showMessage('请输入子菜单标签', 'error'); return }
  if (addChildParentIndex.value === null) return
  const parent = menuItems.value[addChildParentIndex.value] as any
  if (!parent.child) parent.child = []
  parent.child.push({ label, messages: [] })
  autoSave(); showAddDialog.value = false; newMenuLabel.value = ''
}
function cancelAddChildItem() { showAddDialog.value = false; newMenuLabel.value = ''; addingAsChild.value = false; addChildParentIndex.value = null }

function editChildItem(parentIdx: number, childIdx: number) {
  editingIndex.value = childIdx; isAddingChild.value = true; parentIndex.value = parentIdx; showEditor.value = true
}
function deleteChildItem(parentIdx: number, childIdx: number) {
  if (confirm('确定要删除这个子菜单项吗？')) {
    const parent = menuItems.value[parentIdx]
    if (parent && 'child' in parent && parent.child) { parent.child.splice(childIdx, 1); autoSave() }
  }
}

function handleSaveMenuItem(messages: any[]) {
  if (isAddingChild.value && parentIndex.value !== null) {
    const parent = menuItems.value[parentIndex.value] as any
    if (!parent.child) parent.child = []
    if (editingIndex.value !== null) {
      const existingChild = parent.child[editingIndex.value]
      parent.child[editingIndex.value] = { label: existingChild.label, messages }
    } else {
      parent.child.push({ label: '新子菜单', messages })
    }
  } else {
    if (editingIndex.value !== null) {
      const existingItem = menuItems.value[editingIndex.value]
      if (existingItem) { menuItems.value[editingIndex.value] = { label: existingItem.label, messages } }
    } else {
      menuItems.value.push({ label: '新菜单项', messages })
    }
  }
  autoSave(); showEditor.value = false
}

function handleUpdateKeyword(newKeyword: string) {
  if (isAddingChild.value || editingIndex.value === null) return
  const item = menuItems.value[editingIndex.value]; if (!item) return
  if (!newKeyword.trim()) { showMessage('菜单名称不能为空', 'error'); return }
  item.label = newKeyword.trim(); autoSave(); showMessage('菜单名称已更新', 'success')
}

function hasChildren(item: ActionMenuItem): boolean { return 'child' in item && Array.isArray(item.child) }
function getChildCount(item: ActionMenuItem): number { if ('child' in item && item.child) return item.child.length; return 0 }

function showMessage(text: string, type: 'success' | 'error') {
  if (messageTimer !== null) clearTimeout(messageTimer)
  message.value = text; messageType.value = type
  messageTimer = window.setTimeout(() => { message.value = ''; messageTimer = null }, 3000)
}

onMounted(() => { fetchConfig() })

const itemsCount = computed(() => menuItems.value.length)
const editingKeyword = computed(() => {
  if (isAddingChild.value) {
    if (parentIndex.value !== null) {
      const parent = menuItems.value[parentIndex.value]
      if (parent) return `${parent.label} > 子菜单`
    }
    return '子菜单'
  }
  if (editingIndex.value !== null) { const item = menuItems.value[editingIndex.value]; if (item) return item.label }
  return '新菜单项'
})
const editingMessages = computed(() => {
  if (isAddingChild.value && parentIndex.value !== null) {
    const parent = menuItems.value[parentIndex.value]
    if (parent && hasChildren(parent)) {
      const childIndex = editingIndex.value !== null ? editingIndex.value : 0
      return (parent as any).child?.[childIndex]?.messages || []
    }
  }
  if (editingIndex.value !== null) { const item = menuItems.value[editingIndex.value]; if (item) return (item as any).messages || [] }
  return []
})
</script>

<template>
  <article class="panel-card">
    <div class="card-head">
      <h2 class="card-title">底部菜单设置</h2>
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 border-2 border-[#ce8256] rounded-full bg-transparent text-[#ce8256] text-base font-bold cursor-pointer transition-all duration-200 flex items-center justify-center p-0 leading-none hover:bg-[#ce8256] hover:text-[#fff8f2] hover:scale-110 active:scale-95" @click="showHelp = !showHelp" :title="showHelp ? '隐藏帮助' : '显示帮助'">{{ showHelp ? '✕' : '?' }}</button>
        <span class="card-pill" v-if="loading">加载中...</span>
        <span class="card-pill" v-else-if="saving">保存中...</span>
        <span class="card-pill" v-else-if="isDirty" :class="{ 'bg-[#ffe082] text-[#f57c00] animate-[pulse_2s_infinite]': isDirty }">未保存</span>
        <span class="card-pill" v-else>{{ itemsCount }} 组</span>
      </div>
    </div>

    <div v-if="message" :class="['fixed top-5 right-5 px-5 py-3 rounded-lg text-sm z-9999 shadow-lg min-w-50 text-center animate-[slideInRight_0.3s_ease]', messageType === 'success' ? 'bg-[rgba(76,175,80,0.95)] text-white' : 'bg-[rgba(244,67,54,0.95)] text-white']">{{ message }}</div>

    <transition name="help-slide">
      <div v-if="showHelp" class="mb-5 p-4 px-5 bg-[rgba(206,130,86,0.08)] dark:bg-[rgba(206,130,86,0.06)] border-l-4 border-[#ce8256] rounded-lg">
        <p class="mb-2 mt-0 text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed">💡 <strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">使用说明：</strong>快捷菜单会在聊天界面底部显示，用户可以快速点击发送预设的消息。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] dark:border-[rgba(206,130,86,0.15)] mb-0 text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed">支持两种类型：<strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">扁平菜单项</strong>（直接发送消息）和<strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">分组菜单项</strong>（包含多个子菜单）。</p>
        <p class="mt-2 text-[13px] text-[#9d6547] dark:text-[#a09080] mb-0">📌 提示：点击菜单项可以编辑其内容，点击 × 按钮可以删除。</p>
      </div>
    </transition>

    <div class="mb-5">
      <button class="w-full py-3 px-5 border-2 border-dashed border-[#ce8256] rounded-lg bg-[rgba(206,130,86,0.05)] text-[#ce8256] text-sm cursor-pointer transition-all duration-200 font-medium hover:bg-[rgba(206,130,86,0.1)] hover:border-[#b8714a] hover:text-[#b8714a] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed" @click="addMenuItem" :disabled="loading || saving">+ 添加菜单项</button>
    </div>

    <div v-if="itemsCount === 0" class="text-center py-15 px-5 text-[#9d6547] dark:text-[#a09080]">
      <div class="text-5xl mb-4 opacity-60">📭</div>
      <p class="m-0 text-[15px]">暂无菜单配置</p>
      <p class="mt-2 text-[13px] text-[#b89a85] dark:text-[#8b8b8b]">添加第一个菜单项开始配置吧！</p>
    </div>

    <div v-else class="flex flex-col gap-3 mt-5">
      <div v-for="(item, index) in menuItems" :key="index" draggable="true" @dragstart="handleDragStart(index)" @dragover="handleDragOver($event, index)" @dragleave="handleDragLeave" @drop="handleDrop(index)" @dragend="handleDragEnd" :class="['bg-[#fafafa] dark:bg-[#1f2123] border-2 rounded-xl p-3 md:p-4 transition-all duration-200 cursor-move', draggingIndex === index ? 'opacity-50 border-[#ce8256] bg-[#fff8f5] dark:bg-[#2a221e]' : '', dragOverIndex === index && draggingIndex !== index ? 'border-[#ce8256] bg-[#fff8f5] dark:bg-[#2a221e] shadow-[0_4px_12px_rgba(206,130,86,0.2)] scale-[1.02]' : 'border-[#f0e6dd] dark:border-[#2b2d30] hover:border-[#ce8256] hover:bg-[#fff8f5] dark:hover:bg-[#2a221e] hover:shadow-[0_4px_12px_rgba(206,130,86,0.1)]']">
        <div class="flex justify-between items-start md:items-center mb-3 gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-lg text-[#ce8256] cursor-grab active:cursor-grabbing mr-1" title="拖拽排序">☰</span>
            <span class="text-sm md:text-base font-semibold text-[#32241b] dark:text-[#c7cbd1] cursor-pointer transition-colors duration-200 hover:text-[#ce8256] truncate" @click="openEditNameDialog(index)" title="点击编辑名称">{{ item.label }}</span>
            <span v-if="hasChildren(item)" class="text-xs text-[#ce8256] bg-[rgba(206,130,86,0.1)] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{{ getChildCount(item) }} 个子项</span>
            <span v-else class="text-xs text-[#4caf50] bg-[rgba(76,175,80,0.1)] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{{ (item as any).messages?.length || 0 }} 条消息</span>
          </div>
          <div class="flex gap-1.5 md:gap-2 shrink-0">
            <template v-if="hasChildren(item)">
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(76,175,80,0.1)] text-[#4caf50] hover:bg-[rgba(76,175,80,0.2)]" @click="addChildItem(index)" title="添加子菜单">+ 子项</button>
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(156,39,176,0.1)] text-[#9c27b0] hover:bg-[rgba(156,39,176,0.2)]" @click="convertToFlat(index)" title="转换为扁平菜单">转为扁平</button>
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(244,67,54,0.1)] text-[#f44336] hover:bg-[rgba(244,67,54,0.2)]" @click="deleteMenuItem(index)">删除</button>
            </template>
            <template v-else>
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(206,130,86,0.1)] text-[#ce8256] hover:bg-[rgba(206,130,86,0.2)]" @click="editMenuItem(index)">编辑消息</button>
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(33,150,243,0.1)] text-[#2196f3] hover:bg-[rgba(33,150,243,0.2)]" @click="convertToGroup(index)" title="转换为分组菜单">转为分组</button>
              <button class="py-1 px-2 md:py-1.5 md:px-3 border-none rounded-md text-xs md:text-[13px] cursor-pointer transition-all duration-200 font-medium bg-[rgba(244,67,54,0.1)] text-[#f44336] hover:bg-[rgba(244,67,54,0.2)]" @click="deleteMenuItem(index)">删除</button>
            </template>
          </div>
        </div>

        <div v-if="hasChildren(item) && 'child' in item && item.child && item.child.length > 0" class="mt-3 pt-3 border-t border-dashed border-[#e8ddd3] dark:border-[#2b2d30] flex flex-col gap-2">
          <div v-for="(child, childIndex) in ((item as any).child as any[])" :key="childIndex" draggable="true" @dragstart="handleChildDragStart(index, Number(childIndex))" @dragover="handleChildDragOver($event, index, Number(childIndex))" @dragleave="handleChildDragLeave" @drop="handleChildDrop(index, Number(childIndex))" @dragend="handleChildDragEnd" :class="['flex justify-between items-center p-2 md:p-2 md:px-3 bg-white dark:bg-[#1f2123] border rounded-md transition-all duration-200', draggingChildIndex?.parentIndex === index && draggingChildIndex?.childIndex === Number(childIndex) ? 'opacity-50 border-[#ce8256] bg-[#fff8f5] dark:bg-[#2a221e]' : '', dragOverChildIndex?.parentIndex === index && dragOverChildIndex?.childIndex === Number(childIndex) && !(draggingChildIndex?.parentIndex === index && draggingChildIndex?.childIndex === Number(childIndex)) ? 'border-[#ce8256] bg-[#fff8f5] dark:bg-[#2a221e] shadow-[0_2px_8px_rgba(206,130,86,0.2)] scale-[1.01]' : 'border-[#f0e6dd] dark:border-[#2b2d30] hover:border-[#ce8256] hover:bg-[#fff8f5] dark:hover:bg-[#2a221e]']">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-sm text-[#ce8256] cursor-grab active:cursor-grabbing mr-1" title="拖拽排序">☰</span>
              <span class="text-xs md:text-sm text-[#6f4c39] dark:text-[#c7cbd1] font-medium cursor-pointer transition-colors duration-200 hover:text-[#ce8256] truncate" @click="openEditChildNameDialog(index, Number(childIndex))" title="点击编辑名称">{{ child.label }}</span>
              <span class="text-xs text-[#4caf50] bg-[rgba(76,175,80,0.1)] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{{ child.messages?.length || 0 }} 条消息</span>
            </div>
            <div class="flex gap-1 md:gap-1.5 shrink-0">
              <button class="py-0.5 px-1.5 md:py-1 md:px-2 border-none rounded text-xs cursor-pointer transition-all duration-200 bg-[rgba(206,130,86,0.1)] text-[#ce8256] hover:bg-[rgba(206,130,86,0.2)]" @click="editChildItem(index, Number(childIndex))">编辑</button>
              <button class="py-0.5 px-1.5 md:py-1 md:px-2 border-none rounded w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-sm md:text-base p-0 cursor-pointer transition-all duration-200 bg-[rgba(244,67,54,0.1)] text-[#f44336] hover:bg-[rgba(244,67,54,0.2)]" @click="deleteChildItem(index, Number(childIndex))">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
    <div v-if="showEditNameDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 animate-fade-in">
      <div class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-100 shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up">
        <div class="flex justify-between items-center p-5 px-6 border-b-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="cancelEditName()" />
          <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">编辑菜单名称</h3>
          <div class="w-8"></div>
        </div>
        <div class="p-6">
          <div class="mb-5">
            <label class="block text-[13px] text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">菜单名称</label>
            <input v-model="newMenuName" type="text" placeholder="输入菜单名称..." @keyup.enter="confirmEditName()" class="w-full py-2.5 px-3.5 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg text-sm transition-all duration-200 bg-white dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] font-inherit focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]" autofocus />
          </div>
        </div>
        <div class="flex gap-3 p-4 px-6 border-t-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e0e0e0] dark:hover:bg-[#3a3c3f]" @click="cancelEditName()">取消</button>
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="confirmEditName()">确定</button>
        </div>
      </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div v-if="showAddDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 animate-fade-in">
      <div class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-100 shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up">
        <div class="flex justify-between items-center p-5 px-6 border-b-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="addingAsChild ? cancelAddChildItem() : cancelAddMenuItem()" />
          <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">{{ addingAsChild ? '添加子菜单项' : '添加菜单项' }}</h3>
          <div class="w-8"></div>
        </div>
        <div class="p-6">
          <div class="mb-5">
            <label class="block text-[13px] text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">菜单标签</label>
            <input v-model="newMenuLabel" type="text" :placeholder="addingAsChild ? '输入子菜单名称...' : '输入菜单名称...'" @keyup.enter="addingAsChild ? confirmAddChildItem() : confirmAddMenuItem()" class="w-full py-2.5 px-3.5 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg text-sm transition-all duration-200 bg-white dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] font-inherit focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]" autofocus />
          </div>
        </div>
        <div class="flex gap-3 p-4 px-6 border-t-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e0e0e0] dark:hover:bg-[#3a3c3f]" @click="addingAsChild ? cancelAddChildItem() : cancelAddMenuItem()">取消</button>
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="addingAsChild ? confirmAddChildItem() : confirmAddMenuItem()">确定</button>
        </div>
      </div>
    </div>
    </Teleport>

    <MessageList v-model="showEditor" :keyword="editingKeyword" :messages="editingMessages" :title="isAddingChild ? '编辑子菜单项' : (editingIndex !== null ? menuItems[editingIndex]?.label || '编辑菜单项' : '添加菜单项')" keyword-label="菜单名称" :show-loading-time="true" :editable="!isAddingChild && editingIndex !== null" @update:messages="handleSaveMenuItem" @update:keyword="handleUpdateKeyword" />
  </article>
</template>

<style scoped>
.help-slide-enter-active, .help-slide-leave-active { transition: all 0.3s ease; max-height: 200px; opacity: 1; }
.help-slide-enter-from, .help-slide-leave-to { max-height: 0; opacity: 0; margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
.card-title { font-size: 1.45rem; letter-spacing: -0.03em; margin: 0; color: #9d6547; text-transform: uppercase; letter-spacing: 0.16em; font-size: 16px; font-weight: 500; }
.dark .card-title { color: #c0a090; }
.panel-card { margin: 0; padding: 24px 32px 32px; border-radius: 16px; background: rgb(255, 255, 255); border: none; box-shadow: none; overflow-y: auto; height: 100%; }
.dark .panel-card { background: #1a1c1e; }
@media (max-width: 768px) { .panel-card { padding: 16px; border-radius: 0; } .card-head { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 16px; } .card-title { font-size: 18px; } }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.card-pill { padding: 8px 12px; border-radius: 999px; background: #f1e1d4; color: #8d563d; font-size: 12px; white-space: nowrap; }
.dark .card-pill { background: #2b2d30; color: #c0a090; }
@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 0.3s ease; }
@keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-slide-up { animation: slide-up 0.3s ease; }
</style>
