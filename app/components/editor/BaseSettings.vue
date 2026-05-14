<script setup lang="ts">
import type { AvatarConfig } from '~~/shared/types/config'

// 使用应用数据管理
const appStore = useAppStore()
const appDataManager = useAppDataManager()

// 数据状态
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
let messageTimer: number | null = null

// 头像配置
const avatarConfig = ref<AvatarConfig>({
  bot: undefined,
  user: undefined
})

// 对话框状态
const showAvatarDialog = ref(false)
const editingAvatarType = ref<'bot' | 'user'>('bot')

// 图片加载错误状态
const botAvatarError = ref(false)
const userAvatarError = ref(false)

// 获取配置
async function fetchConfig() {
  loading.value = true
  try {
    const data = appStore.datas?.baseConfig
    if (data && data.avatar) {
      avatarConfig.value = {
        bot: data.avatar.bot,
        user: data.avatar.user
      }
    }
  } catch (error) {
    console.error('Failed to fetch config:', error)
    showMessage('获取配置失败', 'error')
  } finally {
    loading.value = false
  }
}

// 保存头像配置
async function saveAvatarConfig() {
  saving.value = true
  try {
    await appDataManager.updateBaseConfig({
      avatar: avatarConfig.value
    })
    showMessage('头像配置保存成功', 'success')
  } catch (error: any) {
    console.error('Failed to save config:', error)
    showMessage(error.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

// 打开头像编辑对话框
function openAvatarDialog(type: 'bot' | 'user') {
  editingAvatarType.value = type
  showAvatarDialog.value = true
}

// 头像保存处理
function handleAvatarSave(type: 'bot' | 'user', url: string) {
  if (type === 'bot') {
    avatarConfig.value.bot = url
  } else {
    avatarConfig.value.user = url
  }
  
  // 重置错误状态
  if (type === 'bot') {
    botAvatarError.value = false
  } else {
    userAvatarError.value = false
  }
  
  // 自动保存
  saveAvatarConfig()
}

// 处理图片加载错误
function handleBotAvatarError() {
  botAvatarError.value = true
}

function handleUserAvatarError() {
  userAvatarError.value = true
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

// 监听配置变化，重置错误状态
watch(() => avatarConfig.value.bot, () => {
  botAvatarError.value = false
})

watch(() => avatarConfig.value.user, () => {
  userAvatarError.value = false
})

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <article class="panel-card">
    <div class="card-head">
      <h2 class="card-title">头像设置</h2>
      <div class="flex items-center gap-3">
        <span class="card-pill" v-if="loading">加载中...</span>
        <span class="card-pill" v-else-if="saving">保存中...</span>
        <span class="card-pill" v-else>已配置</span>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="['fixed top-5 right-5 px-5 py-3 rounded-lg text-sm z-9999 shadow-lg min-w-50 text-center animate-[slideInRight_0.3s_ease]', messageType === 'success' ? 'bg-[rgba(76,175,80,0.95)] text-white' : 'bg-[rgba(244,67,54,0.95)] text-white']">
      {{ message }}
    </div>

    <!-- 头像设置区域 -->
    <div class="avatar-section mt-6">
      <div class="grid grid-cols-2 gap-5">
        <!-- 机器人头像 -->
        <div class="flex flex-col items-center cursor-pointer p-4 rounded-xl transition-all duration-200 bg-white/50 hover:bg-[rgba(206,130,86,0.1)] hover:-translate-y-0.5" @click="openAvatarDialog('bot')">
          <div class="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#ce8256] bg-[#f5f5f5] flex items-center justify-center mb-3 transition-all duration-200 hover:border-[#b8714a] hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)]">
            <!-- 头像加载成功 -->
            <img 
              v-if="avatarConfig.bot && !botAvatarError" 
              :src="avatarConfig.bot" 
              alt="机器人头像"
              class="w-full h-full object-cover"
              @error="handleBotAvatarError"
            >
            <!-- 头像加载失败 -->
            <div 
              v-else-if="avatarConfig.bot && botAvatarError"
              class="w-full h-full flex flex-col items-center justify-center bg-[#fff3e0]"
            >
              <span class="text-[20px] mb-0.5">⚠️</span>
              <span class="text-[#e65100] text-[8px] font-medium leading-tight">失败</span>
            </div>
            <!-- 默认占位符 -->
            <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-linear-to-br from-[#f5f5f5] to-[#e0e0e0]">
              <span>🤖</span>
            </div>
          </div>
          <p class="text-sm text-[#32241b] m-0 mb-1 font-medium">机器人头像</p>
          <p class="text-xs text-[#9d6547] m-0">点击更换</p>
        </div>

        <!-- 访客头像 -->
        <div class="flex flex-col items-center cursor-pointer p-4 rounded-xl transition-all duration-200 bg-white/50 hover:bg-[rgba(206,130,86,0.1)] hover:-translate-y-0.5" @click="openAvatarDialog('user')">
          <div class="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#ce8256] bg-[#f5f5f5] flex items-center justify-center mb-3 transition-all duration-200 hover:border-[#b8714a] hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)]">
            <!-- 头像加载成功 -->
            <img 
              v-if="avatarConfig.user && !userAvatarError" 
              :src="avatarConfig.user" 
              alt="访客头像"
              class="w-full h-full object-cover"
              @error="handleUserAvatarError"
            >
            <!-- 头像加载失败 -->
            <div 
              v-else-if="avatarConfig.user && userAvatarError"
              class="w-full h-full flex flex-col items-center justify-center bg-[#fff3e0]"
            >
              <span class="text-[20px] mb-0.5">⚠️</span>
              <span class="text-[#e65100] text-[8px] font-medium leading-tight">失败</span>
            </div>
            <!-- 默认占位符 -->
            <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-linear-to-br from-[#f5f5f5] to-[#e0e0e0]">
              <span>👤</span>
            </div>
          </div>
          <p class="text-sm text-[#32241b] m-0 mb-1 font-medium">访客头像</p>
          <p class="text-xs text-[#9d6547] m-0">点击更换</p>
        </div>
      </div>
    </div>

    <!-- 头像编辑对话框 -->
    <DialogAvatar
      v-model="showAvatarDialog" 
      :type="editingAvatarType"
      :avatar-url="avatarConfig[editingAvatarType]"
      @save="handleAvatarSave"
    />
  </article>
</template>

<style scoped>
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
</style>
