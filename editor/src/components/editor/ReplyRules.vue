<script setup lang="ts">
import type { MessageConfig } from '@shared/types/message'
import type { KeywordReplyConfig, RegexReplyConfig } from '@shared/types/config'

interface ReplyRuleItem {
  id: string
  type: 'keyword' | 'regex'
  messages: MessageConfig[]
  order?: number
}

const appStore = useAppStore()
const appDataManager = useAppDataManager()

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const showHelp = ref(false)

const keywordDirty = ref(false)
const regexDirty = ref(false)
const helloDirty = ref(false)
let saveTimer: number | null = null
let messageTimer: number | null = null

const helloMessages = ref<MessageConfig[]>([])
const replyRules = ref<ReplyRuleItem[]>([])

const newRuleText = ref('')
const useRegexMode = ref(false)

const showEditor = ref(false)
const editingRuleId = ref<string | null>(null)

const showOrderEditor = ref(false)
const editingOrderRuleId = ref<string | null>(null)
const newOrderValue = ref<number>(1)

async function fetchConfig() {
  loading.value = true
  replyRules.value = []
  helloMessages.value = []

  try {
    const keywordData = appStore.datas?.keywordReplies
    if (keywordData) {
      const keywordRules: ReplyRuleItem[] = Object.entries(keywordData).map(([key, messages]) => ({
        id: key,
        type: 'keyword' as const,
        messages: Array.isArray(messages) ? messages : []
      }))
      replyRules.value = [...keywordRules]
    }

    const regexData = appStore.datas?.regexReplies
    if (regexData && Array.isArray(regexData)) {
      const regexRules: ReplyRuleItem[] = regexData.map((item, index) => ({
        id: item.pattern || '',
        type: 'regex' as const,
        messages: Array.isArray(item.messages) ? item.messages : [],
        order: index + 1
      })).filter(item => item.id)

      replyRules.value = [...replyRules.value, ...regexRules]
    }

    const baseData = appStore.datas?.baseConfig
    if (baseData && baseData.helloMsg) {
      helloMessages.value = Array.isArray(baseData.helloMsg) ? baseData.helloMsg : []
    }

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

function autoSave(type?: 'keyword' | 'regex' | 'hello') {
  if (type) {
    if (type === 'keyword') keywordDirty.value = true
    else if (type === 'regex') regexDirty.value = true
    else if (type === 'hello') helloDirty.value = true
  } else {
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

async function performSave() {
  const hasChanges = keywordDirty.value || regexDirty.value || helloDirty.value
  if (!hasChanges) return

  saving.value = true
  try {
    let savedCount = 0

    if (keywordDirty.value) {
      const keywordRules = replyRules.value.filter(rule => rule.type === 'keyword')
      const keywordConfig: KeywordReplyConfig = {}
      keywordRules.forEach(rule => {
        keywordConfig[rule.id] = rule.messages
      })
      await appDataManager.updateKeywordReplies(keywordConfig)
      keywordDirty.value = false
      savedCount++
    }

    if (regexDirty.value) {
      const regexRules = replyRules.value.filter(rule => rule.type === 'regex')
      const regexConfig: RegexReplyConfig = regexRules.map(rule => ({
        pattern: rule.id,
        messages: rule.messages
      }))
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

function addRule() {
  const text = newRuleText.value.trim()
  if (!text) {
    showMessage('请输入内容', 'error')
    return
  }

  const exists = replyRules.value.some(rule => rule.id === text && rule.type === (useRegexMode.value ? 'regex' : 'keyword'))
  if (exists) {
    showMessage(`该${useRegexMode.value ? '正则' : '关键词'}已存在`, 'error')
    return
  }

  const newRule: ReplyRuleItem = {
    id: text,
    type: useRegexMode.value ? ('regex' as const) : ('keyword' as const),
    messages: []
  }

  if (useRegexMode.value) {
    const regexCount = replyRules.value.filter(r => r.type === 'regex').length
    newRule.order = regexCount + 1
  }

  replyRules.value.push(newRule)
  newRuleText.value = ''
  autoSave(useRegexMode.value ? 'regex' : 'keyword')
}

function deleteRule(id: string) {
  const rule = replyRules.value.find(r => r.id === id)
  if (!rule) return
  const typeName = rule.type === 'keyword' ? '关键词' : '正则'
  if (confirm(`确定要删除${typeName} "${id}" 吗？`)) {
    replyRules.value = replyRules.value.filter(rule => rule.id !== id)
    autoSave(rule.type)
  }
}

function openEditDialog(ruleId: string) {
  editingRuleId.value = ruleId
  showEditor.value = true
}

function openHelloDialog() {
  editingRuleId.value = '__hello__'
  showEditor.value = true
}

function closeDialog() {
  showEditor.value = false
  editingRuleId.value = null
}

function getEditingMessages(): MessageConfig[] {
  if (editingRuleId.value === '__hello__') {
    return helloMessages.value
  }
  const rule = replyRules.value.find(r => r.id === editingRuleId.value)
  return rule ? rule.messages : []
}

function updateRuleMessages(messages: (MessageConfig & { role?: any })[]) {
  if (!editingRuleId.value) return
  const messagesWithoutRole = messages.map(({ role, ...msg }) => msg as MessageConfig)

  if (editingRuleId.value === '__hello__') {
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

function updateRuleKeyword(newKeyword: string) {
  const oldId = editingRuleId.value
  if (!oldId || oldId === '__hello__') return
  if (!newKeyword) { showMessage('名称不能为空', 'error'); return }
  if (newKeyword === oldId) return

  const exists = replyRules.value.some(rule => rule.id === newKeyword && rule.type === replyRules.value.find(r => r.id === oldId)?.type)
  if (exists) { showMessage('该名称已存在', 'error'); return }

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

function openOrderEditor(ruleId: string) {
  const rule = replyRules.value.find(r => r.id === ruleId)
  if (!rule || rule.type !== 'regex') return
  editingOrderRuleId.value = ruleId
  newOrderValue.value = rule.order || 1
  showOrderEditor.value = true
}

function closeOrderEditor() {
  showOrderEditor.value = false
  editingOrderRuleId.value = null
  newOrderValue.value = 1
}

function confirmOrderChange() {
  if (!editingOrderRuleId.value) return
  const rule = replyRules.value.find(r => r.id === editingOrderRuleId.value)
  if (!rule || rule.type !== 'regex') return

  const newOrder = newOrderValue.value
  const regexRules = replyRules.value.filter(r => r.type === 'regex')
  const maxOrder = regexRules.length

  if (newOrder < 1) { showMessage('顺序不能小于1', 'error'); return }
  if (newOrder > maxOrder) { showMessage(`顺序不能超过 ${maxOrder}（当前正则规则总数）`, 'error'); return }

  const oldOrder = rule.order || 1
  if (newOrder === oldOrder) { closeOrderEditor(); return }

  const updatedRules = [...replyRules.value]
  const regexIndices = updatedRules.map((r, i) => r.type === 'regex' ? i : -1).filter(i => i !== -1)

  const currentRuleIndex = updatedRules.findIndex(r => r.id === editingOrderRuleId.value)
  const currentIndex = regexIndices.indexOf(currentRuleIndex)

  if (currentIndex === -1 || currentRuleIndex === -1) { closeOrderEditor(); return }

  const removedRules = updatedRules.splice(currentRuleIndex, 1)
  const movedRule = removedRules[0]
  if (!movedRule) { closeOrderEditor(); return }

  const newIndex = regexIndices[newOrder - 1]
  if (newIndex === undefined) { closeOrderEditor(); return }

  updatedRules.splice(newIndex, 0, movedRule)

  let orderCounter = 1
  updatedRules.forEach(r => {
    if (r.type === 'regex') { r.order = orderCounter++ }
  })

  replyRules.value = updatedRules
  autoSave('regex')
  closeOrderEditor()
  showMessage('顺序修改成功', 'success')
}

function showMessage(text: string, type: 'success' | 'error') {
  if (messageTimer !== null) { clearTimeout(messageTimer) }
  message.value = text
  messageType.value = type
  messageTimer = window.setTimeout(() => { message.value = ''; messageTimer = null }, 3000)
}

const groupedRules = computed(() => {
  const keywords = replyRules.value.filter(rule => rule.type === 'keyword')
  const regexes = replyRules.value.filter(rule => rule.type === 'regex')
  return { keywords, regexes }
})

const totalRulesCount = computed(() => replyRules.value.length)

onMounted(() => { fetchConfig() })
</script>

<template>
  <article class="panel-card">
    <div class="card-head">
      <h2 class="card-title">回复规则配置</h2>
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 border-2 border-[#ce8256] rounded-full bg-transparent text-[#ce8256] text-base font-bold cursor-pointer transition-all duration-200 flex items-center justify-center p-0 leading-none hover:bg-[#ce8256] hover:text-[#fff8f2] hover:scale-110 active:scale-95" @click="showHelp = !showHelp" :title="showHelp ? '隐藏帮助' : '显示帮助'">{{ showHelp ? '✕' : '?' }}</button>
        <span class="card-pill" v-if="loading">加载中...</span>
        <span class="card-pill" v-else-if="saving">保存中...</span>
        <span class="card-pill" v-else-if="keywordDirty || regexDirty || helloDirty" :class="{ 'bg-[#ffe082] text-[#f57c00] animate-[pulse_2s_infinite]': keywordDirty || regexDirty || helloDirty }">未保存</span>
        <span class="card-pill" v-else>{{ totalRulesCount }} 条</span>
      </div>
    </div>

    <div v-if="message" :class="['fixed top-5 right-5 px-5 py-3 rounded-lg text-sm z-9999 shadow-lg min-w-50 text-center animate-[slideInRight_0.3s_ease]', messageType === 'success' ? 'bg-[rgba(76,175,80,0.95)] text-white' : 'bg-[rgba(244,67,54,0.95)] text-white']">{{ message }}</div>

    <div class="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
      <div class="flex gap-2 flex-1">
        <input type="text" v-model="newRuleText" :placeholder="useRegexMode ? '输入正则表达式（如：^你好.*$）...' : '输入关键词...'" :disabled="loading || saving" @keyup.enter="addRule" class="flex-1 py-2.5 px-3.5 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg text-sm transition-all duration-200 bg-white dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f5f5f5] dark:disabled:bg-[#2b2d30] min-w-0">
        <button class="py-2.5 px-3 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg bg-white dark:bg-[#1f2123] text-[#9d6547] dark:text-[#c0a090] text-sm font-bold cursor-pointer transition-all duration-200 flex items-center justify-center shrink-0 hover:border-[#ce8256] hover:text-[#ce8256] [&.active]:bg-[#ce8256] [&.active]:border-[#ce8256] [&.active]:text-[#fff8f2]" @click="useRegexMode = !useRegexMode" :class="{ active: useRegexMode }" :title="useRegexMode ? '关闭正则模式' : '开启正则模式'"><span class="font-mono text-base">.*</span></button>
      </div>
      <button class="py-2.5 px-5 border-none rounded-lg bg-[#ce8256] text-[#fff8f2] text-sm cursor-pointer transition-all duration-200 font-medium whitespace-nowrap hover:bg-[#b8714a] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed" @click="addRule" :disabled="loading || saving || !newRuleText.trim()">添加规则</button>
    </div>

    <transition name="help-slide">
      <div v-if="showHelp" class="mb-5 p-3 md:p-4 md:px-5 bg-[rgba(206,130,86,0.08)] dark:bg-[rgba(206,130,86,0.06)] border-l-4 border-[#ce8256] rounded-lg">
        <p class="mb-2 mt-0 text-xs md:text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed">💡 <strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">使用说明：</strong>当用户发送的消息匹配规则时，会自动回复配置的消息。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] dark:border-[rgba(206,130,86,0.15)] mb-0 text-xs md:text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed"><strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">关键词：</strong>完全匹配用户消息。例如：配置关键词 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] dark:text-[#d4955e] font-medium">你好</code> 后，用户发送"你好"将触发回复。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] dark:border-[rgba(206,130,86,0.15)] mb-0 text-xs md:text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed"><strong class="text-[#b8714a] dark:text-[#d4955e] font-semibold">正则：</strong>使用正则表达式模糊匹配。例如：配置正则 <code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] dark:text-[#d4955e] font-medium">^你好.*$</code> 后，用户发送"你好"、"你好啊"等都会触发回复。</p>
        <p class="mt-2 text-[11px] md:text-[13px] text-[#9d6547] dark:text-[#a09080] mb-0">📌 提示：支持文本、图片、HTML、文件、导航等多种消息类型。正则按数组顺序依次匹配，匹配到第一个即停止。</p>
        <p class="mt-2 pt-2 border-t border-dashed border-[rgba(206,130,86,0.3)] dark:border-[rgba(206,130,86,0.15)] mb-0 text-xs md:text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed">常用正则示例：<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] dark:text-[#d4955e] font-medium break-all">\\d+条消息</code> 匹配"10条消息"、<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[11px] md:text-[13px] text-[#b8714a] dark:text-[#d4955e] font-medium">.*帮助.*</code> 匹配包含"帮助"的消息</p>
      </div>
    </transition>

    <div class="flex flex-wrap gap-2 md:gap-3 mt-5">
      <div class="inline-flex items-center">
        <div class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#4caf50] to-[#388e3c] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(76,175,80,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(76,175,80,0.3)]" @click="openHelloDialog" title="点击编辑问候语">
          <span class="text-base">👋</span>
          <span class="whitespace-nowrap">问候语</span>
          <span class="bg-[rgba(255,255,255,0.3)] py-0.5 px-2 rounded-[10px] text-xs font-semibold">{{ helloMessages.length }} 条</span>
        </div>
      </div>
      <div v-for="rule in groupedRules.keywords" :key="rule.id" class="inline-flex items-center">
        <div class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#ce8256] to-[#b8714a] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(206,130,86,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)] active:translate-y-0 max-w-full" @click="openEditDialog(rule.id)" :title="`点击编辑关键词 ${rule.id}`">
          <span class="whitespace-nowrap truncate max-w-30 md:max-w-none">{{ rule.id }}</span>
          <button class="w-4 h-4 md:w-5 md:h-5 border-none rounded-full bg-[rgba(255,255,255,0.3)] text-[#fff8f2] text-sm md:text-base leading-none cursor-pointer transition-all duration-200 flex items-center justify-center p-0 hover:bg-[rgba(255,255,255,0.5)] hover:scale-110 shrink-0" @click.stop="deleteRule(rule.id)" title="删除关键词">×</button>
        </div>
      </div>
      <div v-for="rule in groupedRules.regexes" :key="rule.id" class="inline-flex items-center">
        <div class="inline-flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 px-2.5 md:px-3.5 bg-linear-to-br from-[#9c27b0] to-[#7b1fa2] text-[#fff8f2] rounded-[20px] cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(156,39,176,0.2)] text-xs md:text-sm font-medium relative hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(156,39,176,0.3)] active:translate-y-0 max-w-full" @click="openEditDialog(rule.id)" :title="`点击编辑正则 ${rule.id}`">
          <span class="bg-[rgba(255,255,255,0.25)] py-0.5 px-2 rounded-[10px] text-xs font-semibold font-mono cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.4)] hover:scale-110" @click.stop="openOrderEditor(rule.id)" title="点击修改顺序">#{{ rule.order }}</span>
          <span class="whitespace-nowrap truncate max-w-30 md:max-w-none">{{ rule.id }}</span>
          <button class="w-4 h-4 md:w-5 md:h-5 border-none rounded-full bg-[rgba(255,255,255,0.3)] text-[#fff8f2] text-sm md:text-base leading-none cursor-pointer transition-all duration-200 flex items-center justify-center p-0 hover:bg-[rgba(255,255,255,0.5)] hover:scale-110 shrink-0" @click.stop="deleteRule(rule.id)" title="删除正则">×</button>
        </div>
      </div>
    </div>

    <div v-if="totalRulesCount === 0" class="text-center py-15 px-5 text-[#9d6547] dark:text-[#a09080]">
      <div class="text-5xl mb-4 opacity-60">💬</div>
      <p class="m-0 text-[15px]">暂无回复规则配置</p>
      <p class="mt-2 text-[13px] text-[#b89a85] dark:text-[#8b8b8b]">添加第一个规则开始配置吧！</p>
    </div>

    <MessageList v-model="showEditor" :keyword="editingRuleId === '__hello__' ? '问候语' : editingRuleId" :messages="getEditingMessages()" :action-label="editingRuleId === '__hello__' ? '打招呼' : '回复'" :show-loading-time="true" :keyword-label="editingRuleId === '__hello__' ? '问候语' : (replyRules.find(r => r.id === editingRuleId)?.type === 'regex' ? '正则表达式' : '关键词')" :editable="editingRuleId !== '__hello__'" :editable-role="false" @update:messages="updateRuleMessages" @update:keyword="updateRuleKeyword" />

    <Teleport to="body">
    <div v-if="showOrderEditor" class="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 animate-fade-in">
      <div class="bg-white dark:bg-[#1a1c1e] rounded-2xl w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up">
        <div class="flex justify-between items-center p-5 px-6 border-b-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="closeOrderEditor" />
          <h3 class="text-lg text-[#32241b] dark:text-[#ebedf0] m-0 font-semibold">修改正则匹配顺序</h3>
          <div class="w-8"></div>
        </div>
        <div class="p-6">
          <div class="mb-5 p-4 bg-[rgba(206,130,86,0.08)] dark:bg-[rgba(206,130,86,0.06)] rounded-lg border-l-4 border-[#ce8256]">
            <p class="mb-2 mt-0 text-sm text-[#6f4c39] dark:text-[#c7cbd1] leading-relaxed font-medium">当前正则：<code class="bg-[rgba(206,130,86,0.15)] py-0.5 px-2 rounded font-mono text-[13px] text-[#b8714a] dark:text-[#d4955e] font-medium break-all">{{ editingOrderRuleId }}</code></p>
            <p class="mb-2 text-sm text-[#9d6547] dark:text-[#a09080] leading-relaxed">当前顺序：第 {{ replyRules.find(r => r.id === editingOrderRuleId)?.order }} 位</p>
            <p class="m-0 text-sm text-[#9d6547] dark:text-[#a09080] leading-relaxed">正则规则总数：{{ groupedRules.regexes.length }}</p>
          </div>
          <div class="mb-4">
            <label class="block text-[13px] text-[#7a5a48] dark:text-[#a0a5ab] mb-1.5 font-medium" for="new-order-value">新顺序：</label>
            <input id="new-order-value" type="number" v-model.number="newOrderValue" min="1" :max="groupedRules.regexes.length" placeholder="输入新的顺序..." @keyup.enter="confirmOrderChange" autofocus class="w-full py-2.5 px-3.5 border-2 border-[#e8ddd3] dark:border-[#3a3c3f] rounded-lg text-sm transition-all duration-200 bg-white dark:bg-[#1f2123] text-[#32241b] dark:text-[#c7cbd1] font-inherit focus:outline-none focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]">
          </div>
          <p class="m-0 text-[13px] text-[#9d6547] dark:text-[#a09080] leading-relaxed p-3 bg-[rgba(206,130,86,0.05)] dark:bg-[rgba(206,130,86,0.04)] rounded-md">💡 提示：输入的数字表示该正则将移动到的新位置，其他正则会相应调整顺序。</p>
        </div>
        <div class="flex gap-3 p-4 px-6 border-t-2 border-[#f0e6dd] dark:border-[#2b2d30]">
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-[#c7cbd1] hover:bg-[#e0e0e0] dark:hover:bg-[#3a3c3f]" @click="closeOrderEditor">取消</button>
          <button class="flex-1 py-2.5 px-5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="confirmOrderChange">确定</button>
        </div>
      </div>
    </div>
    </Teleport>
  </article>
</template>

<style scoped>
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
.dark .card-title { color: #c0a090; }
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
.dark .panel-card { background: #1a1c1e; }
@media (max-width: 768px) {
  .panel-card { padding: 16px; border-radius: 0; }
  .card-head { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
  .card-title { font-size: 18px; }
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
.dark .card-pill { background: #2b2d30; color: #c0a090; }
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in { animation: fade-in 0.3s ease; }
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up { animation: slide-up 0.3s ease; }
</style>
