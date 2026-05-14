<script setup lang="ts">
import type { MessageConfig } from '~~/shared/types/message'
import type { KeywordReplyConfig, RegexReplyConfig } from '~~/shared/types/config'

// 统一回复规则配置项类型
interface ReplyRuleItem {
  id: string              // 唯一标识（关键词或正则表达式）
  type: 'keyword' | 'regex'  // 类型：关键词或正则
  messages: MessageConfig[]    // 消息列表
  order?: number               // 正则规则的顺序（仅对正则有效）
}

// 使用应用数据管理
const appStore = useAppStore()
const appDataManager = useAppDataManager()

// 数据状态
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const showHelp = ref(false)

// 分别追踪每种配置的脏状态
const keywordDirty = ref(false)
const regexDirty = ref(false)
const helloDirty = ref(false)
let saveTimer: number | null = null
let messageTimer: number | null = null

// 问候语数据
const helloMessages = ref<MessageConfig[]>([])

// 回复规则数据
const replyRules = ref<ReplyRuleItem[]>([])

// 新规则输入
const newRuleText = ref('')
const useRegexMode = ref(false)  // 是否使用正则模式

// 编辑对话框状态
const showEditor = ref(false)
const editingRuleId = ref<string | null>(null)

// 正则顺序编辑状态
const showOrderEditor = ref(false)
const editingOrderRuleId = ref<string | null>(null)
const newOrderValue = ref<number>(1)

// 获取配置
async function fetchConfig() {
  loading.value = true
  replyRules.value = []
  helloMessages.value = []
  
  try {
    // 获取关键词回复配置
    const keywordData = appStore.datas?.keywordReplies
    if (keywordData) {
      const keywordRules: ReplyRuleItem[] = Object.entries(keywordData).map(([key, messages]) => ({
        id: key,
        type: 'keyword' as const,
        messages: Array.isArray(messages) ? messages : []
      }))
      replyRules.value = [...keywordRules]
    }
    
    // 获取正则回复配置
    const regexData = appStore.datas?.regexReplies
    if (regexData && Array.isArray(regexData)) {
      const regexRules: ReplyRuleItem[] = regexData.map((item, index) => ({
        id: item.pattern || '',
        type: 'regex' as const,
        messages: Array.isArray(item.messages) ? item.messages : [],
        order: index + 1  // 设置顺序，从1开始
      })).filter(item => item.id)
      
      replyRules.value = [...replyRules.value, ...regexRules]
    }
    
    // 获取问候语配置
    const baseData = appStore.datas?.baseConfig
    if (baseData && baseData.helloMsg) {
      helloMessages.value = Array.isArray(baseData.helloMsg) ? baseData.helloMsg : []
    }
    
    // 清除所有脏状态
    keywordDirty.value = false
    regexDirty.value = false
    helloDirty.value = false
  } catch (error) {
    console.error('Failed to fetch config:', error)
    showMessage('获取配置失败', 'error')
  } finally {
    loading.value = false
  }
}

// 自动保存（带防抖）
function autoSave(type?: 'keyword' | 'regex' | 'hello') {
  if (type) {
    // 标记特定类型的配置为脏
    if (type === 'keyword') keywordDirty.value = true
    else if (type === 'regex') regexDirty.value = true
    else if (type === 'hello') helloDirty.value = true
  } else {
    // 兼容旧调用，标记所有类型为脏
    keywordDirty.value = true
    regexDirty.value = true
    helloDirty.value = true
  }
  
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
  }
  
  saveTimer = window.setTimeout(async () => {
    await performSave()
  }, 500)
}

// 执行保存
async function performSave() {
  const hasChanges = keywordDirty.value || regexDirty.value || helloDirty.value
  if (!hasChanges) return
  
  saving.value = true
  try {
    let savedCount = 0
    
    // 只保存有变化的配置
    if (keywordDirty.value) {
      // 分离关键词规则
      const keywordRules = replyRules.value.filter(rule => rule.type === 'keyword')
      
      // 构建关键词配置对象
      const keywordConfig: KeywordReplyConfig = {}
      keywordRules.forEach(rule => {
        keywordConfig[rule.id] = rule.messages
      })
      
      // 保存关键词配置
      await appDataManager.updateKeywordReplies(keywordConfig)
      
      keywordDirty.value = false
      savedCount++
    }
    
    if (regexDirty.value) {
      // 分离正则规则
      const regexRules = replyRules.value.filter(rule => rule.type === 'regex')
      
      // 构建正则配置数组
      const regexConfig: RegexReplyConfig = regexRules.map(rule => ({
        pattern: rule.id,
        messages: rule.messages
      }))
      
      // 保存正则配置
      await appDataManager.updateRegexReplies(regexConfig)
      
      regexDirty.value = false
      savedCount++
    }
    
    if (savedCount > 0) {
      showMessage(`成功保存 ${savedCount} 项配置`, 'success')
    }
  } catch (error: any) {
    console.error('Failed to save config:', error)
    showMessage(error.message || '保存失败', 'error')
  } finally {
    saving.value = false
    saveTimer = null
  }
}

// 保存问候语
async function saveHello() {
  try {
    await appDataManager.updateBaseConfig({
      helloMsg: helloMessages.value
    })
    helloDirty.value = false
    showMessage('问候语保存成功', 'success')
  } catch (error: any) {
    console.error('Failed to save hello:', error)
    showMessage(error.message || '保存失败', 'error')
  }
}

// 添加新规则
function addRule() {
  const text = newRuleText.value.trim()
  if (!text) {
    showMessage('请输入内容', 'error')
    return
  }
  
  // 检查是否已存在
  const exists = replyRules.value.some(rule => rule.id === text && rule.type === (useRegexMode.value ? 'regex' : 'keyword'))
  if (exists) {
    showMessage(`该${useRegexMode.value ? '正则' : '关键词'}已存在`, 'error')
    return
  }
  
  // 创建新规则
  const newRule: ReplyRuleItem = {
    id: text,
    type: useRegexMode.value ? ('regex' as const) : ('keyword' as const),
    messages: []
  }
  
  // 如果是正则规则，设置顺序为最后
  if (useRegexMode.value) {
    const regexCount = replyRules.value.filter(r => r.type === 'regex').length
    newRule.order = regexCount + 1
  }
  
  replyRules.value.push(newRule)
  newRuleText.value = ''
  autoSave(useRegexMode.value ? 'regex' : 'keyword')
}

// 删除规则
function deleteRule(id: string) {
  const rule = replyRules.value.find(r => r.id === id)
  if (!rule) return
  
  const typeName = rule.type === 'keyword' ? '关键词' : '正则'
  if (confirm(`确定要删除${typeName} "${id}" 吗？`)) {
    replyRules.value = replyRules.value.filter(rule => rule.id !== id)
    autoSave(rule.type)
  }
}

// 打开编辑对话框
function openEditDialog(ruleId: string) {
  editingRuleId.value = ruleId
  showEditor.value = true
}

// 打开问候语编辑对话框
function openHelloDialog() {
  editingRuleId.value = '__hello__'
  showEditor.value = true
}

// 关闭对话框
function closeDialog() {
  showEditor.value = false
  editingRuleId.value = null
}

// 获取当前编辑规则的消息列表
function getEditingMessages(): MessageConfig[] {
  if (editingRuleId.value === '__hello__') {
    return helloMessages.value
  }
  
  const rule = replyRules.value.find(r => r.id === editingRuleId.value)
  return rule ? rule.messages : []
}

// 更新规则的消息列表
function updateRuleMessages(messages: (MessageConfig & { role?: any })[]) {
  if (!editingRuleId.value) return
  
  // 移除 role 字段，只保留 MessageConfig 的字段
  const messagesWithoutRole = messages.map(({ role, ...msg }) => msg as MessageConfig)
  
  if (editingRuleId.value === '__hello__') {
    // 更新问候语
    helloMessages.value = messagesWithoutRole
    helloDirty.value = true
    saveHello()
    return
  }
  
  const ruleIndex = replyRules.value.findIndex(r => r.id === editingRuleId.value)
  if (ruleIndex !== -1) {
    const rule = replyRules.value[ruleIndex]
    if (rule) {
      rule.messages = messagesWithoutRole
      autoSave(rule.type)
    }
  }
}

// 更新规则的名称（重命名）
function updateRuleKeyword(newKeyword: string) {
  const oldId = editingRuleId.value
  
  if (!oldId || oldId === '__hello__') return
  
  if (!newKeyword) {
    showMessage('名称不能为空', 'error')
    return
  }
  
  if (newKeyword === oldId) {
    // 名称未改变，直接关闭
    return
  }
  
  // 检查是否已存在
  const exists = replyRules.value.some(rule => rule.id === newKeyword && rule.type === replyRules.value.find(r => r.id === oldId)?.type)
  
  if (exists) {
    showMessage('该名称已存在', 'error')
    return
  }
  
  // 执行重命名
  const ruleIndex = replyRules.value.findIndex(r => r.id === oldId)
  if (ruleIndex !== -1) {
    const rule = replyRules.value[ruleIndex]
    if (rule) {
      rule.id = newKeyword
      editingRuleId.value = newKeyword
      autoSave(rule.type)
      showMessage('重命名成功', 'success')
    }
  }
}

// 打开正则顺序编辑器
function openOrderEditor(ruleId: string) {
  const rule = replyRules.value.find(r => r.id === ruleId)
  if (!rule || rule.type !== 'regex') return
  
  editingOrderRuleId.value = ruleId
  newOrderValue.value = rule.order || 1
  showOrderEditor.value = true
}

// 关闭顺序编辑器
function closeOrderEditor() {
  showOrderEditor.value = false
  editingOrderRuleId.value = null
  newOrderValue.value = 1
}

// 确认修改顺序
function confirmOrderChange() {
  if (!editingOrderRuleId.value) return
  
  const rule = replyRules.value.find(r => r.id === editingOrderRuleId.value)
  if (!rule || rule.type !== 'regex') return
  
  const newOrder = newOrderValue.value
  const regexRules = replyRules.value.filter(r => r.type === 'regex')
  const maxOrder = regexRules.length
  
  // 验证输入
  if (newOrder < 1) {
    showMessage('顺序不能小于1', 'error')
    return
  }
  
  if (newOrder > maxOrder) {
    showMessage(`顺序不能超过 ${maxOrder}（当前正则规则总数）`, 'error')
    return
  }
  
  const oldOrder = rule.order || 1
  
  if (newOrder === oldOrder) {
    // 顺序未改变，直接关闭
    closeOrderEditor()
    return
  }
  
  // 重新排序：将目标规则移到新位置，其他规则相应调整
  const updatedRules = [...replyRules.value]
  
  // 找到所有正则规则
  const regexIndices = updatedRules
    .map((r, i) => r.type === 'regex' ? i : -1)
    .filter(i => i !== -1)
  
  // 找到当前规则的索引
  const currentRuleIndex = updatedRules.findIndex(r => r.id === editingOrderRuleId.value)
  const currentIndex = regexIndices.indexOf(currentRuleIndex)
  
  if (currentIndex === -1 || currentRuleIndex === -1) {
    closeOrderEditor()
    return
  }
  
  // 移除当前规则
  const removedRules = updatedRules.splice(currentRuleIndex, 1)
  const movedRule = removedRules[0]
  
  if (!movedRule) {
    closeOrderEditor()
    return
  }
  
  // 计算新的插入位置
  const newIndex = regexIndices[newOrder - 1]
  
  if (newIndex === undefined) {
    closeOrderEditor()
    return
  }
  
  // 插入到新位置
  updatedRules.splice(newIndex, 0, movedRule)
  
  // 重新计算所有正则规则的顺序
  let orderCounter = 1
  updatedRules.forEach(r => {
    if (r.type === 'regex') {
      r.order = orderCounter++
    }
  })
  
  replyRules.value = updatedRules
  autoSave('regex')
  closeOrderEditor()
  showMessage('顺序修改成功', 'success')
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

// 计算属性：按类型分组的规则
const groupedRules = computed(() => {
  const keywords = replyRules.value.filter(rule => rule.type === 'keyword')
  const regexes = replyRules.value.filter(rule => rule.type === 'regex')
  return { keywords, regexes }
})

// 计算属性：总规则数
const totalRulesCount = computed(() => replyRules.value.length)

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <article class="panel-card">
    <div class="card-head">
      <h2 class="card-title">回复规则配置</h2>
      <div class="flex items-center gap-3">
        <button 
          class="w-8 h-8 border-2 border-[#ce8256] rounded-full bg-transparent text-[#ce8256] text-base font-bold cursor-pointer transition-all duration-200 flex items-center justify-center p-0 leading-none hover:bg-[#ce8256] hover:text-[#fff8f2] hover:scale-110 active:scale-95" 
          @click="showHelp = !showHelp"
          :title="showHelp ? '隐藏帮助' : '显示帮助'"
        >
          {{ showHelp ? '✕' : '?' }}
        </button>
        <span class="card-pill" v-if="loading">加载中...</span>
        <span class="card-pill" v-else-if="saving">保存中...</span>
        <span class="card-pill" v-else-if="keywordDirty || regexDirty || helloDirty" :class="{ 'bg-[#ffe082] text-[#f57c00] animate-[pulse_2s_infinite]': keywordDirty || regexDirty || helloDirty }">未保存</span>
        <span class="card-pill" v-else>{{ totalRulesCount }} 条</span>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="['fixed top-5 right-5 px-5 py-3 rounded-lg text-sm z-9999 shadow-lg min-w-50 text-center animate-[slideInRight_0.3s_ease]', messageType === 'success' ? 'bg-[rgba(76,175,80,0.95)] text-white' : 'bg-[rgba(244,67,54,0.95)] text-white']">
      {{ message }}
    </div>

    <!-- 添加新规则 -->
    <div class="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
      <div class="flex gap-2 flex-1">
        <input 
          type="text" 
          v-model="newRuleText" 
          :placeholder="useRegexMode ? '输入正则表达式（如：^你好.*$）...' : '输入关键词...'"
          :disabled="loading || saving"
          @keyup.enter="addRule"
          class="flex-1 py-2.5 px-3.5 border-2 border-[#e8ddd3] rounded-lg text-sm transition-all duration-200 bg-white focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f5f5f5] min-w-0"
        >
        <button 
          class="py-2.5 px-3 border-2 border-[#e8ddd3] rounded-lg bg-white text-[#9d6547] text-sm font-bold cursor-pointer transition-all duration-200 flex items-center justify-center shrink-0 hover:border-[#ce8256] hover:text-[#ce8256] [&.active]:bg-[#ce8256] [&.active]:border-[#ce8256] [&.active]:text-[#fff8f2]" 
          @click="useRegexMode = !useRegexMode"
          :class="{ active: useRegexMode }"
          :title="useRegexMode ? '关闭正则模式' : '开启正则模式'"
        >
          <span class="font-mono text-base">.*</span>
        </button>
      </div>
      <button 
        class="py-2.5 px-5 border-none rounded-lg bg-[#ce8256] text-[#fff8f2] text-sm cursor-pointer transition-all duration-200 font-medium whitespace-nowrap hover:bg-[#b8714a] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed" 
        @click="addRule"
        :disabled="loading || saving || !newRuleText.trim()"
      >
        添加规则
      </button>
    </div>

    <!-- 帮助信息 -->
    <transition name="help-slide">
      <div v-if="showHelp" class="mb-5 p-3 md:p-4 md:px-5 bg-[rgba(206,130,86,0.08)] border-l-4 border-[#ce8256] rounded-lg">
        <p class="mb-2 mt-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed">💡 <strong class="text-[#b8714a] font-semibold">使用说明：</strong>当用户发送的消息匹配规则时，会自动回复配置的消息。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] mb-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed"><strong class="text-[#b8714a] font-semibold">关键词：</strong>完全匹配用户消息。例如：配置关键词 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium">你好</code> 后，用户发送"你好"将触发回复。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] mb-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed"><strong class="text-[#b8714a] font-semibold">正则：</strong>使用正则表达式模糊匹配。例如：配置正则 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium">^你好.*$</code> 后，用户发送"你好"、"你好啊"等都会触发回复。</p>
        <p class="mt-2 text-[11px] md:text-[13px] text-[#9d6547] mb-0">📌 提示：支持文本、图片、HTML、文件、导航等多种消息类型。正则按数组顺序依次匹配，匹配到第一个即停止。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] mb-0 text-xs md:text-sm text-[#6f4c39] leading-relaxed">常用正则示例：<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium break-all">\\d+条消息</code> 匹配"10条消息"、<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] font-medium">.*帮助.*</code> 匹配包含"帮助"的消息</p>
      </div>
    </transition>


    <!-- 规则列表 -->
    <div class="flex flex-wrap gap-2 md:gap-3 mt-5">
      <!-- 问候语项（固定显示在顶部） -->
      <div class="inline-flex items-center">
        <div 
          class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#4caf50] to-[#388e3c] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(76,175,80,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(76,175,80,0.3)]"
          @click="openHelloDialog"
          title="点击编辑问候语"
        >
          <span class="text-base">👋</span>
          <span class="whitespace-nowrap">问候语</span>
          <span class="bg-[rgba(255,255,255,0.3)] py-0.5 px-2 rounded-[10px] text-xs font-semibold">{{ helloMessages.length }} 条</span>
        </div>
      </div>
      
      <!-- 关键词规则 -->
      <div 
        v-for="rule in groupedRules.keywords" 
        :key="rule.id"
        class="inline-flex items-center"
      >
        <div 
          class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#ce8256] to-[#b8714a] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(206,130,86,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 max-w-full"
          @click="openEditDialog(rule.id)"
          :title="`点击编辑关键词 ${rule.id}`"
        >
          <span class="whitespace-nowrap truncate max-w-30 md:max-w-none">{{ rule.id }}</span>
          <button 
            class="w-4 h-4 md:w-5 md:h-5 border-none rounded-full bg-[rgba(255,255,255,0.3)] text-[#fff8f2] text-sm md:text-base leading-none cursor-pointer transition-all duration-200 flex items-center justify-center p-0 hover:bg-[rgba(255,255,255,0.5)] hover:scale-110 shrink-0" 
            @click.stop="deleteRule(rule.id)"
            title="删除关键词"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- 正则规则 -->
      <div 
        v-for="rule in groupedRules.regexes" 
        :key="rule.id"
        class="inline-flex items-center"
      >
        <div 
          class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#9c27b0] to-[#7b1fa2] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(156,39,176,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(156,39,176,0.3)] active:translate-y-0 max-w-full"
          @click="openEditDialog(rule.id)"
          :title="`点击编辑正则 ${rule.id}`"
        >
          <span 
            class="bg-[rgba(255,255,255,0.25)] py-0.5 px-2 rounded-[10px] text-xs font-semibold font-mono cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.4)] hover:scale-110"
            @click.stop="openOrderEditor(rule.id)"
            title="点击修改顺序"
          >
            #{{ rule.order }}
          </span>
          <span class="whitespace-nowrap truncate max-w-30 md:max-w-none">{{ rule.id }}</span>
          <button 
            class="w-4 h-4 md:w-5 md:h-5 border-none rounded-full bg-[rgba(255,255,255,0.3)] text-[#fff8f2] text-sm md:text-base leading-none cursor-pointer transition-all duration-200 flex items-center justify-center p-0 hover:bg-[rgba(255,255,255,0.5)] hover:scale-110 shrink-0" 
            @click.stop="deleteRule(rule.id)"
            title="删除正则"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="totalRulesCount === 0" class="text-center py-15 px-5 text-[#9d6547]">
      <div class="text-5xl mb-4 opacity-60">💬</div>
      <p class="m-0 text-[15px]">暂无回复规则配置</p>
      <p class="mt-2 text-[13px] text-[#b89a85]">添加第一个规则开始配置吧！</p>
    </div>

    <!-- 编辑对话框 -->
    <DialogMessageList
      v-model="showEditor"
      :keyword="editingRuleId === '__hello__' ? '问候语' : editingRuleId"
      :messages="getEditingMessages()"
      :action-label="editingRuleId === '__hello__' ? '打招呼' : '回复'"
      :show-loading-time="true"
      :keyword-label="editingRuleId === '__hello__' ? '问候语' : (replyRules.find(r => r.id === editingRuleId)?.type === 'regex' ? '正则表达式' : '关键词')"
      :editable="editingRuleId !== '__hello__'"
      :editable-role="false"
      @update:messages="updateRuleMessages"
      @update:keyword="updateRuleKeyword"
    />

    <!-- 正则顺序编辑对话框 -->
    <Teleport to="body">
    <div v-if="showOrderEditor" class="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 animate-fade-in">
      <div class="bg-white rounded-2xl w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up">
        <div class="flex justify-between items-center p-5 px-6 border-b-2 border-[#f0e6dd]">
          <MacWindowControls 
            :show-close="true"
            :show-minimize="false"
            :show-maximize="false"
            :clickable="true"
            close-title="关闭"
            @close="closeOrderEditor"
          />
          <h3 class="text-lg text-[#32241b] m-0 font-semibold">修改正则匹配顺序</h3>
          <div class="w-8"></div>
        </div>
        <div class="p-6">
          <div class="mb-5 p-4 bg-[rgba(206,130,86,0.08)] rounded-lg border-l-4 border-[#ce8256]">
            <p class="mb-2 mt-0 text-sm text-[#6f4c39] leading-relaxed font-medium">当前正则：<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[13px] text-[#b8714a] font-medium break-all">{{ editingOrderRuleId }}</code></p>
            <p class="mb-2 text-sm text-[#9d6547] leading-relaxed">当前顺序：第 {{ replyRules.find(r => r.id === editingOrderRuleId)?.order }} 位</p>
            <p class="m-0 text-sm text-[#9d6547] leading-relaxed">正则规则总数：{{ groupedRules.regexes.length }}</p>
          </div>
          <div class="mb-4">
            <label class="block text-[13px] text-[#7a5a48] mb-1.5 font-medium" for="new-order-value">新顺序：</label>
            <input 
              id="new-order-value"
              type="number" 
              v-model.number="newOrderValue"
              min="1"
              :max="groupedRules.regexes.length"
              placeholder="输入新的顺序..."
              @keyup.enter="confirmOrderChange"
              autofocus
              class="w-full py-2.5 px-3.5 border-2 border-[#e8ddd3] rounded-lg text-sm transition-all duration-200 bg-white font-inherit focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]"
            >
          </div>
          <p class="m-0 text-[13px] text-[#9d6547] leading-relaxed p-3 bg-[rgba(206,130,86,0.05)] rounded-md">💡 提示：输入的数字表示该正则将移动到的新位置，其他正则会相应调整顺序。</p>
        </div>
        <div class="flex gap-3 p-4 px-6 border-t-2 border-[#f0e6dd]">
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] text-[#6f4c39] hover:bg-[#e0e0e0]" @click="closeOrderEditor">取消</button>
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="confirmOrderChange">确定</button>
        </div>
      </div>
    </div>
    </Teleport>
  </article>
</template>

<style scoped>
/* 帮助信息滑入动画 */
.help-slide-enter-active,
.help-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
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

/* 淡入动画 */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease;
}

/* 向上滑动动画 */
@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease;
}
</style>
