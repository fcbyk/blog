<script setup lang="ts">
import type { MessageConfig, MessageRole } from '@shared/types/message'

interface Props {
  modelValue: boolean
  message?: MessageConfig & { role?: MessageRole } | null
  showLoadingTime?: boolean
  editableRole?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', message: MessageConfig & { role?: MessageRole }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  message: null,
  showLoadingTime: true,
  editableRole: true
})

const emit = defineEmits<Emits>()

const messageTypeOptions = [
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'html', label: 'HTML' },
  { value: 'file', label: '文件' },
  { value: 'nav', label: '导航' }
]

const roleOptions = [
  { value: 'bot', label: '机器人' },
  { value: 'user', label: '用户' }
]

const editingMessage = ref<MessageConfig & { role?: MessageRole }>({
  type: 'text',
  content: '',
  role: 'bot',
  loadingTime: undefined
})

const useCustomLoadingTime = ref(false)

function calculateLoadingTime(text: string, minTime: number = 500, maxTime: number = 3000): number {
  const charSpeed = 25
  const baseTime = text.length * charSpeed
  const randomFactor = 0.85 + Math.random() * 0.3
  const adjustedTime = baseTime * randomFactor
  return Math.min(Math.max(adjustedTime, minTime), maxTime)
}

const displayLoadingTime = computed({
  get() {
    if (useCustomLoadingTime.value) {
      return editingMessage.value.loadingTime
    } else {
      if (editingMessage.value.type === 'text' && typeof editingMessage.value.content === 'string') {
        return Math.round(calculateLoadingTime(editingMessage.value.content))
      }
      return undefined
    }
  },
  set(value) {
    editingMessage.value.loadingTime = value
  }
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.message) {
      editingMessage.value = JSON.parse(JSON.stringify(props.message))
      if (!editingMessage.value.role) editingMessage.value.role = 'bot'
      if (props.showLoadingTime && editingMessage.value.loadingTime !== undefined) {
        useCustomLoadingTime.value = true
      } else {
        useCustomLoadingTime.value = false
        editingMessage.value.loadingTime = undefined
      }
    } else {
      editingMessage.value = { type: 'text', content: '', role: 'bot', loadingTime: undefined }
      useCustomLoadingTime.value = false
    }
  }
})

watch(() => editingMessage.value.role, (newRole) => {
  if (newRole === 'user') {
    editingMessage.value.loadingTime = undefined
    useCustomLoadingTime.value = false
  }
})

function handleClose() {
  emit('update:modelValue', false)
}

function handleSave() {
  if (useCustomLoadingTime.value && editingMessage.value.loadingTime !== undefined) {
    const loadingTime = editingMessage.value.loadingTime
    if (loadingTime < 0 || loadingTime > 10000) {
      alert('加载时间必须在 0-10000 毫秒之间')
      return
    }
  }
  const messageToSave = { ...editingMessage.value }
  if (!useCustomLoadingTime.value) messageToSave.loadingTime = undefined
  emit('save', messageToSave)
  emit('update:modelValue', false)
}

function updateField(field: keyof MessageConfig, value: any) {
  (editingMessage.value as any)[field] = value
}

function toggleCustomLoadingTime(enabled: boolean) {
  useCustomLoadingTime.value = enabled
  if (enabled) {
    editingMessage.value.loadingTime = 1000
  } else {
    editingMessage.value.loadingTime = undefined
  }
}

function updateFileField(field: string, value: string) {
  const content = editingMessage.value.content as any
  if (typeof content !== 'object' || content === null) {
    editingMessage.value.content = { fileName: '', fileSize: '', fileType: '', fileUrl: '' }
  }
  (editingMessage.value.content as any)[field] = value
}

function updateNavField(field: string, value: string) {
  const content = editingMessage.value.content as any
  if (typeof content !== 'object' || content === null) {
    editingMessage.value.content = { title: '', link: '', desc: '', icon: '' }
  }
  (editingMessage.value.content as any)[field] = value
}

function getContentField(field: string): string {
  const content = editingMessage.value.content as any
  if (typeof content === 'object' && content !== null && field in content) {
    return content[field] || ''
  }
  return ''
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSave()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center z-99999">
        <Transition name="dialog">
          <div v-if="modelValue" class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-2xl max-h-[85vh] flex flex-col shadow-xl" @keydown="handleKeydown" tabindex="-1">
            <div class="flex justify-between items-center px-6 py-4 border-b-2 border-[#f0e6dd] dark:border-[#2b2d30]">
              <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="handleClose" />
              <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">{{ message ? '编辑消息' : '添加消息' }}</h3>
              <div class="w-8"></div>
            </div>
            <div class="px-6 py-6 overflow-y-auto flex-1 min-h-0">
              <div class="mb-5 last:mb-0">
                <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">角色</label>
                <select v-model="editingMessage.role" :disabled="!props.editableRole" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm type-select focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)] disabled:bg-[#f5f5f5] dark:disabled:bg-[#2b2d30] disabled:text-gray-400 disabled:cursor-not-allowed">
                  <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <p v-if="!props.editableRole" class="text-xs text-[#9d6547] dark:text-[#a09080] mt-1 mb-0">💡 回复消息的角色固定为机器人</p>
              </div>
              <div class="mb-5 last:mb-0">
                <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">消息类型</label>
                <select v-model="editingMessage.type" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm type-select focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]">
                  <option v-for="opt in messageTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="mb-5 last:mb-0">
                <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium">内容</label>
                <textarea v-if="editingMessage.type === 'text' || editingMessage.type === 'html'" :value="String(editingMessage.content)" @input="(e: Event) => updateField('content', (e.target as HTMLTextAreaElement).value)" placeholder="输入内容..." rows="4" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm resize-y min-h-20 focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]"></textarea>
                <div v-else-if="editingMessage.type === 'image'">
                  <input :value="String(editingMessage.content)" @input="(e: Event) => updateField('content', (e.target as HTMLInputElement).value)" type="text" placeholder="输入图片URL地址..." class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  <div v-if="editingMessage.content" class="mt-3">
                    <img :src="String(editingMessage.content)" alt="预览" class="max-w-full max-h-48 object-contain rounded-xl border border-[#e8ddd3]" @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'" />
                  </div>
                </div>
                <input v-else-if="['audio', 'video', 'music'].includes(editingMessage.type)" :value="String(editingMessage.content)" @input="(e: Event) => updateField('content', (e.target as HTMLInputElement).value)" type="text" placeholder="输入URL地址..." class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                <div v-else-if="editingMessage.type === 'file'" class="flex flex-col gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">文件名</label>
                    <input :value="getContentField('fileName')" @input="updateFileField('fileName', ($event.target as HTMLInputElement).value)" type="text" placeholder="例如：document.pdf" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">文件大小</label>
                    <input :value="getContentField('fileSize')" @input="updateFileField('fileSize', ($event.target as HTMLInputElement).value)" type="text" placeholder="例如：2.5MB" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">文件类型</label>
                    <input :value="getContentField('fileType')" @input="updateFileField('fileType', ($event.target as HTMLInputElement).value)" type="text" placeholder="例如：PDF文档" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">文件URL</label>
                    <input :value="getContentField('fileUrl')" @input="updateFileField('fileUrl', ($event.target as HTMLInputElement).value)" type="text" placeholder="https://example.com/file.pdf" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                </div>
                <div v-else-if="editingMessage.type === 'nav'" class="flex flex-col gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">标题</label>
                    <input :value="getContentField('title')" @input="updateNavField('title', ($event.target as HTMLInputElement).value)" type="text" placeholder="网站标题" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">链接</label>
                    <input :value="getContentField('link')" @input="updateNavField('link', ($event.target as HTMLInputElement).value)" type="text" placeholder="https://example.com" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">描述（可选）</label>
                    <input :value="getContentField('desc')" @input="updateNavField('desc', ($event.target as HTMLInputElement).value)" type="text" placeholder="简短描述" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-[#7a5a48] dark:text-[#a0a5ab] font-medium">图标URL（可选）</label>
                    <input :value="getContentField('icon')" @input="updateNavField('icon', ($event.target as HTMLInputElement).value)" type="text" placeholder="https://example.com/icon.png" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" />
                  </div>
                </div>
              </div>
              <div v-if="showLoadingTime && editingMessage.role === 'bot'" class="mb-5 last:mb-0">
                <div class="flex justify-between items-center mb-1.5">
                  <label class="block text-sm text-[#7a5a48] dark:text-[#a0a5ab] font-medium">加载时间（毫秒）</label>
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" :checked="useCustomLoadingTime" @change="(e: Event) => toggleCustomLoadingTime((e.target as HTMLInputElement).checked)" class="hidden" />
                    <span :class="['relative w-11 h-6 rounded-xl transition-all duration-300 ease', useCustomLoadingTime ? 'bg-[#ce8256]' : 'bg-[#e8ddd3]']">
                      <span :class="['absolute h-4.5 w-4.5 bottom-0.75 rounded-full transition-all duration-300 ease bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]', useCustomLoadingTime ? 'translate-x-5 left-0.75' : 'left-0.75']" />
                    </span>
                    <span class="text-xs text-[#7a5a48] font-medium">{{ useCustomLoadingTime ? '自定义' : '使用默认值' }}</span>
                  </label>
                </div>
                <input v-model.number="displayLoadingTime" type="number" min="0" max="10000" step="100" class="w-full px-3.5 py-3.5 border border-[#e8ddd3]/60 dark:border-[#3a3c3f]/60 rounded-2xl bg-[#fffdf9] dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] outline-none text-sm disabled:bg-[#f5f5f5] dark:disabled:bg-[#2b2d30] disabled:text-gray-400 dark:disabled:text-[#6b7076] disabled:cursor-not-allowed focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]" :disabled="!useCustomLoadingTime" :placeholder="useCustomLoadingTime ? '' : '500ms-1000ms随机值'" />
                <p class="text-xs text-[#9d6547] dark:text-[#a09080] mt-1 mb-0">消息显示前的等待时间</p>
              </div>
            </div>
            <div class="flex gap-3 px-6 py-4 border-t-2 border-[#f0e6dd] dark:border-[#2b2d30]">
              <button class="flex-1 px-5 py-2.5 border-none rounded-2xl text-sm cursor-pointer transition-all duration-200 ease font-medium preset-btn" @click="handleClose">取消</button>
              <button class="flex-1 px-5 py-2.5 border-none rounded-2xl text-sm cursor-pointer transition-all duration-200 ease font-medium preset-btn active" @click="handleSave">确定</button>
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
.type-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a5a48' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; cursor: pointer; }
.preset-btn { padding: 12px 14px; border: 0; border-radius: 16px; background: #efe1d4; color: #6e4a37; cursor: pointer; transition: 180ms ease; }
.dark .preset-btn { background: #2b2d30; color: #c7cbd1; }
.preset-btn.active, .preset-btn:hover { background: #ce8256; color: #fff8f2; }
</style>
