<script setup lang="ts">
import type { MessageConfig, MessageRole } from '@shared/types/message'

interface Props {
  modelValue: boolean
  keyword: string | null
  messages: (MessageConfig & { role?: MessageRole })[]
  title?: string
  actionLabel?: string
  showLoadingTime?: boolean
  editable?: boolean
  keywordLabel?: string
  editableRole?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:messages', messages: (MessageConfig & { role?: MessageRole })[]): void
  (e: 'update:keyword', keyword: string): void
}

const props = withDefaults(defineProps<Props>(), {
  actionLabel: '',
  showLoadingTime: true,
  editable: true,
  keywordLabel: '名称',
  editableRole: true
})

const emit = defineEmits<Emits>()

const showMessageEditor = ref(false)
const editingMessageIndex = ref<number | null>(null)

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const showRenameDialog = ref(false)
const newKeywordName = ref('')

function handleClose() {
  emit('update:modelValue', false)
}

function openAddMessage() {
  editingMessageIndex.value = null
  showMessageEditor.value = true
}

function openEditMessage(index: number) {
  editingMessageIndex.value = index
  showMessageEditor.value = true
}

function handleSaveMessage(message: MessageConfig & { role?: MessageRole }) {
  const updatedMessages = [...props.messages]
  if (editingMessageIndex.value !== null) {
    updatedMessages[editingMessageIndex.value] = message
  } else {
    updatedMessages.push(message)
  }
  emit('update:messages', updatedMessages)
}

function handleDeleteMessage(index: number) {
  if (confirm('确定要删除这条消息吗？')) {
    const updatedMessages = props.messages.filter((_, i) => i !== index)
    emit('update:messages', updatedMessages)
  }
}

function getMessageTypeLabel(type: string): string {
  const labels: Record<string, string> = { text: '文本', image: '图片', html: 'HTML', file: '文件', nav: '导航' }
  return labels[type] || type
}

function getLoadingTime(msg: MessageConfig): number {
  if (msg.loadingTime !== undefined) return msg.loadingTime
  return 1000
}

function handleDragStart(index: number) { dragIndex.value = index }
function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  dragOverIndex.value = index
}
function handleDragLeave() { dragOverIndex.value = null }
function handleDrop(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) { dragIndex.value = null; dragOverIndex.value = null; return }
  const updatedMessages = [...props.messages]
  const draggedItem = updatedMessages[dragIndex.value]
  if (!draggedItem) { dragIndex.value = null; dragOverIndex.value = null; return }
  updatedMessages.splice(dragIndex.value, 1)
  updatedMessages.splice(index, 0, draggedItem)
  emit('update:messages', updatedMessages)
  setTimeout(() => {
    const messageCards = document.querySelectorAll('.message-card')
    messageCards.forEach((card, i) => {
      if (i === index) { card.classList.add('message-moved'); setTimeout(() => card.classList.remove('message-moved'), 300) }
    })
  }, 50)
  dragIndex.value = null; dragOverIndex.value = null
}
function handleDragEnd() { dragIndex.value = null; dragOverIndex.value = null }

function openRenameDialog() {
  if (!props.editable || !props.keyword) return
  newKeywordName.value = props.keyword
  showRenameDialog.value = true
}
function closeRenameDialog() { showRenameDialog.value = false; newKeywordName.value = '' }
function confirmRename() {
  const newName = newKeywordName.value.trim()
  if (!newName) { alert(`${props.keywordLabel}不能为空`); return }
  if (newName === props.keyword) { closeRenameDialog(); return }
  emit('update:keyword', newName)
  closeRenameDialog()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center z-99999">
        <Transition name="dialog">
          <div v-if="modelValue" class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-3xl max-h-[80vh] flex flex-col shadow-xl">
            <div class="flex justify-between items-center px-6 py-4 border-b-2 border-[#f0e6dd]">
              <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="handleClose" />
              <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold flex items-center gap-2 transition-colors duration-200" :class="{ 'cursor-pointer hover:text-[#ce8256]': props.editable }" @click="openRenameDialog" :title="props.editable ? `点击修改${props.keywordLabel}` : ''">
                {{ props.title || keyword }}
                <span v-if="props.editable" class="text-sm opacity-60 transition-all duration-200 hover:opacity-100 hover:scale-110" :title="`点击修改${props.keywordLabel}`">✏️</span>
                <span class="text-sm text-[#9d6547] dark:text-[#a09080] font-medium">({{ messages.length }} 条消息)</span>
              </h3>
              <div class="w-8"></div>
            </div>
            <div class="px-6 py-6 overflow-y-auto flex-1 min-h-0">
              <div v-if="messages.length === 0" class="text-center py-7.5 px-5 text-[#9d6547] dark:text-[#a09080]">
                <p class="text-sm m-0">暂无{{ actionLabel }}消息，点击下方按钮添加</p>
              </div>
              <div v-else class="flex flex-col gap-3 mb-4">
                <div v-for="(msg, index) in messages" :key="index" class="message-card bg-[#fafafa] dark:bg-[#1f2123] border-2 border-[#f0e6dd] dark:border-[#2b2d30] rounded-lg p-3 transition-all duration-300 ease-in-out cursor-grab relative" :class="{ 'dragging': dragIndex === index, 'drag-over': dragOverIndex === index }" draggable="true" @dragstart="handleDragStart(index)" @dragover="(e: DragEvent) => handleDragOver(e, index)" @dragleave="handleDragLeave" @drop="handleDrop(index)" @dragend="handleDragEnd">
                  <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                      <span class="drag-handle cursor-grab text-[#9d6547] text-lg leading-none select-none p-1 rounded transition-all duration-200 inline-flex items-center justify-center hover:bg-[rgba(206,130,86,0.15)] hover:text-[#ce8256] hover:scale-110 active:cursor-grabbing active:scale-95" title="拖拽排序">⋮⋮</span>
                      <span class="text-xs text-[#ce8256] bg-[rgba(206,130,86,0.1)] px-2 py-0.5 rounded font-medium">{{ getMessageTypeLabel(msg.type) }}</span>
                      <span v-if="showLoadingTime && msg.loadingTime !== undefined" class="text-xs text-[#9d6547] font-medium">{{ getLoadingTime(msg) }}ms</span>
                    </div>
                    <div class="flex gap-2">
                      <button class="px-2.5 py-1 border-none rounded text-xs cursor-pointer transition-all duration-200 bg-[rgba(206,130,86,0.1)] text-[#ce8256] hover:bg-[rgba(206,130,86,0.2)]" @click="openEditMessage(index)">编辑</button>
                      <button class="px-2.5 py-1 border-none rounded text-xs cursor-pointer transition-all duration-200 bg-[rgba(244,67,54,0.1)] text-[#f44336] hover:bg-[rgba(244,67,54,0.2)]" @click="handleDeleteMessage(index)">删除</button>
                    </div>
                  </div>
                  <div class="text-sm text-[#32241b] dark:text-[#c7cbd1] mb-1.5 wrap-break-word">
                    <span v-if="msg.type === 'text' || msg.type === 'html'">{{ String(msg.content).substring(0, 50) }}{{ String(msg.content).length > 50 ? '...' : '' }}</span>
                    <span v-else-if="['image', 'audio', 'video', 'music'].includes(msg.type)">{{ String(msg.content) }}</span>
                    <span v-else-if="msg.type === 'file'">📄 {{ (msg.content as any)?.fileName || '文件' }}</span>
                    <span v-else-if="msg.type === 'nav'">🔗 {{ (msg.content as any)?.title || '导航' }}</span>
                    <span v-else>{{ String(msg.content) }}</span>
                  </div>
                </div>
              </div>
              <button class="w-full py-3 border-2 border-dashed border-[#ce8256] rounded-lg bg-[rgba(206,130,86,0.05)] text-[#ce8256] text-sm cursor-pointer transition-all duration-200 font-medium hover:bg-[rgba(206,130,86,0.1)] hover:border-[#b8714a] hover:text-[#b8714a]" @click="openAddMessage">+ 添加{{ actionLabel }}消息</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <Message v-model="showMessageEditor" :message="editingMessageIndex !== null ? messages[editingMessageIndex] : null" :show-loading-time="showLoadingTime" :editable-role="editableRole" @save="handleSaveMessage" />

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showRenameDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-99999">
        <Transition name="dialog">
          <div v-if="showRenameDialog" class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-md shadow-xl">
            <div class="flex justify-between items-center px-6 py-4 border-b-2 border-[#f0e6dd] dark:border-[#2b2d30]">
              <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="closeRenameDialog" />
              <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">修改{{ props.keywordLabel }}</h3>
              <div class="w-8"></div>
            </div>
            <div class="px-6 py-6">
              <div class="mb-4">
                <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">原{{ props.keywordLabel }}：</label>
                <span class="inline-block px-3 py-2 bg-[#f5f5f5] dark:bg-[#2b2d30] rounded-md text-[#6f4c39] dark:text-[#c7cbd1] text-sm font-medium">{{ keyword }}</span>
              </div>
              <div>
                <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium" for="new-keyword-name">新{{ props.keywordLabel }}：</label>
                <input id="new-keyword-name" type="text" v-model="newKeywordName" :placeholder="`请输入新${props.keywordLabel}...`" @keyup.enter="confirmRename" autofocus class="w-full px-3.5 py-2.5 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg text-sm transition-all duration-200 bg-white dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]">
              </div>
            </div>
            <div class="flex gap-3 px-6 py-4 border-t-2 border-[#f0e6dd] dark:border-[#2b2d30]">
              <button class="flex-1 px-5 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e0e0e0] dark:hover:bg-[#3a3c3f]" @click="closeRenameDialog">取消</button>
              <button class="flex-1 px-5 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="confirmRename">确定</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-enter-active, .dialog-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.dialog-enter-from { opacity: 0; transform: scale(0.9) translateY(20px); }
.dialog-leave-to { opacity: 0; transform: scale(0.9) translateY(-20px); }
.message-moved { animation: messageMove 0.3s ease; }
@keyframes messageMove { 0% { transform: scale(1); } 50% { transform: scale(1.02); box-shadow: 0 4px 12px rgba(206, 130, 86, 0.2); } 100% { transform: scale(1); } }
.dragging { opacity: 0.5; cursor: grabbing; }
.drag-over { border-color: #ce8256; background-color: rgba(206, 130, 86, 0.05); }
</style>
