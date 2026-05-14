<script setup lang="ts">
import type { MessageConfigWithRole } from '~~/shared/types'

// 使用应用数据管理
const appStore = useAppStore()
const appDataManager = useAppDataManager()

// URL 触发配置数据
const items = ref<Record<string, MessageConfigWithRole[]>>({})
const newItem = ref('')

// 对话框相关
const showEditor = ref(false)
const editingKey = ref<string | null>(null)

// 数据状态
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const isDirty = ref(false)
const showHelp = ref(false)
const dbConnectionError = ref(false)  // 数据库连接错误状态
let saveTimer: number | null = null
let messageTimer: number | null = null

// 获取配置
async function fetchConfig() {
  loading.value = true
  dbConnectionError.value = false
  try {
    const data = appStore.datas?.urlTriggers
    if (data) {
      items.value = data || {}
      isDirty.value = false
    } else {
      // 如果返回 null，说明是首次配置
      items.value = {}
    }
  } catch (error) {
    console.error('Failed to fetch config:', error)
    dbConnectionError.value = true
    // 清空数据，避免显示旧数据
    items.value = {}
    console.log('dbConnectionError set to:', dbConnectionError.value)
    showMessage('数据库连接失败', 'error')
  } finally {
    loading.value = false
  }
}

// 自动保存（带防抖）
function autoSave() {
  isDirty.value = true
  
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
  }
  
  saveTimer = window.setTimeout(async () => {
    await performSave()
  }, 500)
}

// 执行保存
async function performSave() {
  if (!isDirty.value) return
  
  saving.value = true
  try {
    await appDataManager.updateUrlTriggers(items.value)
    isDirty.value = false
    dbConnectionError.value = false
    showMessage('保存成功', 'success')
  } catch (error: any) {
    console.error('Failed to save config:', error)
    dbConnectionError.value = true
    showMessage(error.message || '保存失败', 'error')
  } finally {
    saving.value = false
    saveTimer = null
  }
}

// 添加新项
function addItem() {
  const key = newItem.value.trim()
  if (!key) {
    showMessage('请输入参数名', 'error')
    return
  }
  
  if (items.value[key]) {
    showMessage('该参数已存在', 'error')
    return
  }
  
  items.value[key] = []  // 初始化空消息列表
  newItem.value = ''
  autoSave()
}

// 处理键盘事件 - 防止输入法回车触发
function handleKeydown(event: KeyboardEvent) {
  // 如果正在使用输入法（composition），不触发动作
  if (event.isComposing) {
    return
  }
  
  if (event.key === 'Enter') {
    event.preventDefault()
    addItem()
  }
}

// 删除项
function deleteItem(key: string) {
  if (confirm(`确定要删除参数 "${key}" 吗？`)) {
    delete items.value[key]
    autoSave()
  }
}

// 打开编辑对话框
function openEditDialog(key: string) {
  editingKey.value = key
  showEditor.value = true
}

// 关闭对话框
function closeDialog() {
  showEditor.value = false
  editingKey.value = null
}

// 获取当前编辑项的消息列表
function getEditingMessages(): MessageConfigWithRole[] {
  return editingKey.value ? items.value[editingKey.value] || [] : []
}

// 更新项的消息列表
function updateItemMessages(messages: (MessageConfigWithRole | { role?: undefined })[]) {
  if (!editingKey.value) return
  
  // 确保每个消息都有 role 字段
  const messagesWithRole = messages.map(msg => ({
    ...msg,
    role: msg.role || 'bot'
  })) as MessageConfigWithRole[]
  
  items.value[editingKey.value] = messagesWithRole
  autoSave()
}

// 更新项的名称（重命名）
function updateItemKeyword(newKeyword: string) {
  const oldKey = editingKey.value
  
  if (!oldKey) return
  
  if (!newKeyword) {
    showMessage('查询字符串不能为空', 'error')
    return
  }
  
  if (newKeyword === oldKey) {
    return
  }
  
  if (items.value[newKeyword]) {
    showMessage('该参数已存在', 'error')
    return
  }
  
  // 执行重命名：复制数据到新键，删除旧键
  const oldMessages = items.value[oldKey]
  if (oldMessages) {
    items.value[newKeyword] = oldMessages
    delete items.value[oldKey]
    
    // 更新编辑状态
    editingKey.value = newKeyword
    
    autoSave()
    showMessage('查询字符串重命名成功', 'success')
  }
}

// 显示消息提示
function showMessage(text: string, type: 'success' | 'error') {
  if (messageTimer !== null) {
    clearTimeout(messageTimer)
  }
  
  message.value = text
  messageType.value = type
  
  messageTimer = window.setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, 3000)
}

onMounted(() => {
  fetchConfig()
})

// 计算属性：获取项目数量
const itemsCount = computed(() => Object.keys(items.value).length)
</script>

<template>
  <article class="panel-card">
    <div class="card-head">
      <h2 class="card-title">URL匹配规则</h2>
      <div class="flex items-center gap-3">
        <button 
          class="w-8 h-8 border-2 border-[#ce8256] rounded-full bg-transparent text-[#ce8256] text-base font-bold cursor-pointer transition-all duration-200 flex items-center justify-center p-0 leading-none hover:bg-[#ce8256] hover:text-[#fff8f2] hover:scale-110 active:scale-95" 
          @click="showHelp = !showHelp"
          :title="showHelp ? '隐藏帮助' : '显示帮助'"
        >
          {{ showHelp ? '✕' : '?' }}
        </button>
        <span class="card-pill" v-if="loading">加载中...</span>
        <span class="card-pill" v-else-if="dbConnectionError" :class="{ 'bg-[#ff5f57] text-white animate-[pulse_2s_infinite]': dbConnectionError }">数据库连接失败</span>
        <span class="card-pill" v-else-if="saving">保存中...</span>
        <span class="card-pill" v-else-if="isDirty" :class="{ 'bg-[#ffe082] text-[#f57c00] animate-[pulse_2s_infinite]': isDirty }">未保存</span>
        <span class="card-pill" v-else>{{ itemsCount }} 条</span>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="['fixed top-5 right-5 px-5 py-3 rounded-lg text-sm z-9999 shadow-lg min-w-50 text-center animate-[slideInRight_0.3s_ease]', messageType === 'success' ? 'bg-[rgba(76,175,80,0.95)] text-white' : 'bg-[rgba(244,67,54,0.95)] text-white']">
      {{ message }}
    </div>

    <!-- 添加新项 -->
    <div class="flex flex-col sm:flex-row gap-3 mb-5">
      <input 
        type="text" 
        v-model="newItem" 
        placeholder="输入参数名（如：welcome、promo）..."
        :disabled="loading || saving"
        @keydown="handleKeydown"
        class="flex-1 py-2.5 px-3.5 border-2 border-[#e8ddd3] rounded-lg text-sm transition-all duration-200 bg-white focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f5f5f5]"
      >
      <button 
        class="py-2.5 px-5 border-none rounded-lg bg-[#ce8256] text-[#fff8f2] text-sm cursor-pointer transition-all duration-200 font-medium whitespace-nowrap hover:bg-[#b8714a] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed" 
        @click="addItem"
        :disabled="loading || saving || !newItem.trim()"
      >
        添加参数
      </button>
    </div>

    <!-- 帮助信息 -->
    <transition name="help-slide">
      <div v-if="showHelp" class="mb-5 p-3 md:p-4 md:px-5 bg-[rgba(206,130,86,0.08)] border-l-4 border-[#ce8256] rounded-lg">
        <p class="mb-2 mt-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed">💡 <strong class="text-[#b8714a] font-semibold">使用说明：</strong>当用户访问带有指定 URL 参数的页面时，会自动发送配置的消息。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] mb-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed">例如：配置参数 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium">welcome</code> 后，访问 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium break-all">https://fcbyk.me/?welcome</code> 或 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium">?welcome=任意值</code> 都会触发该参数对应的消息。</p>
        <p class="mt-2 text-[11px] md:text-[13px] text-[#9d6547] mb-0">📌 提示：如果消息内容匹配关键词，还会自动触发关键词回复。</p>
      </div>
    </transition>

    <!-- 空状态 -->
    <div v-if="itemsCount === 0" class="text-center py-15 px-5 text-[#9d6547]">
      <div class="text-5xl mb-4 opacity-60">📭</div>
      <p class="m-0 text-[15px]">暂无 URL 配置</p>
      <p class="mt-2 text-[13px] text-[#b89a85]">添加第一个参数开始配置吧！</p>
    </div>

    <!-- 项列表 -->
    <div class="flex flex-wrap gap-2 md:gap-3 mt-5">
      <div 
        v-for="key in Object.keys(items)" 
        :key="key"
        class="inline-flex items-center"
      >
        <div 
          class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#ce8256] to-[#b8714a] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(206,130,86,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 max-w-full"
          @click="openEditDialog(key)"
          :title="`点击编辑 ${key}`"
        >
          <span class="whitespace-nowrap truncate max-w-30 md:max-w-none">{{ key }}</span>
          <button 
            class="w-4 h-4 md:w-5 md:h-5 border-none rounded-full bg-[rgba(255,255,255,0.3)] text-[#fff8f2] text-sm md:text-base leading-none cursor-pointer transition-all duration-200 flex items-center justify-center p-0 hover:bg-[rgba(255,255,255,0.5)] hover:scale-110 shrink-0" 
            @click.stop="deleteItem(key)"
            title="删除参数"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <DialogMessageList
      v-model="showEditor"
      :keyword="editingKey"
      :messages="getEditingMessages()"
      :show-loading-time="true"
      keyword-label="查询字符串"
      @update:messages="updateItemMessages"
      @update:keyword="updateItemKeyword"
    />
  </article>
</template>

<style scoped>
/* 帮助信息滑入动画 */
.help-slide-enter-active,
.help-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  opacity: 1;
}

.help-slide-enter-from,
.help-slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* 卡片样式 */
.card-title {
  font-size: 1.45rem;
  letter-spacing: -0.03em;
  margin: 0;
  color: #9d6547;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 16px;
  font-weight: 500;
}

.panel-card {
  margin: 0;
  padding: 24px 32px 32px;
  border-radius: 16px;
  background: rgb(255, 255, 255);
  border: none;
  box-shadow: none;
  overflow-y: auto;
  height: 100%;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .panel-card {
    padding: 16px;
    border-radius: 0;
  }
  
  .card-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .card-title {
    font-size: 18px;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.card-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f1e1d4;
  color: #8d563d;
  font-size: 12px;
  white-space: nowrap;
}

/* 消息提示滑入动画 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
