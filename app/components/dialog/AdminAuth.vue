<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'verified', success: boolean): void
}>()

const username = ref('')
const password = ref('')
const error = ref(false)
const shaking = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const usernameInputRef = ref<HTMLInputElement | null>(null)
const passwordInputRef = ref<HTMLInputElement | null>(null)

// 监听用户名输入，清除错误状态
watch(username, () => {
  if (error.value) {
    error.value = false
    errorMessage.value = ''
  }
})

// 监听密码输入，清除错误状态
watch(password, () => {
  if (error.value) {
    error.value = false
    errorMessage.value = ''
  }
})

// 打开对话框时重置状态并聚焦输入框
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    username.value = ''
    password.value = ''
    error.value = false
    shaking.value = false
    // 延迟聚焦，确保对话框已渲染
    setTimeout(() => {
      usernameInputRef.value?.focus()
    }, 100)
  }
})

// 关闭对话框
function closeDialog() {
  emit('update:modelValue', false)
  username.value = ''
  password.value = ''
  error.value = false
}

// 验证密码 - 调用后端接口
async function verifyPassword() {
  if (!username.value || !password.value) {
    error.value = true
    errorMessage.value = '请输入用户名和密码'
    triggerShake()
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; message?: string; token?: string }>('/api/auth/verify-auth', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value
      }
    })

    if (response.success) {
      // 密码正确，保存 token
      if (response.token) {
        setToken(response.token)
      }
      // 密码正确
      emit('verified', true)
      closeDialog()
    } else {
      // 密码错误
      error.value = true
      errorMessage.value = response.message || '用户名或密码错误，请重试'
      triggerShake()
      setTimeout(() => {
        passwordInputRef.value?.focus()
      }, 300)
    }
  } catch (err) {
    console.error('验证失败:', err)
    error.value = true
    errorMessage.value = '验证失败，请稍后重试'
    triggerShake()
  } finally {
    loading.value = false
  }
}

// 触发抖动动画
function triggerShake() {
  shaking.value = true
  setTimeout(() => {
    shaking.value = false
  }, 500)
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDialog()
  }
}

// 处理用户名输入框的回车事件
function handleUsernameKeydown(event: KeyboardEvent) {
  // 如果输入法正在组合中，不触发自定义行为
  if (event.isComposing) {
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    passwordInputRef.value?.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center z-99999">
        <Transition name="dialog">
          <div 
            v-if="modelValue"
            :class="['bg-[rgb(250_250_250)] dark:bg-[#1a1c1e] rounded-2xl p-8 w-[90%] max-w-md shadow-[0_25px_80px_rgba(0,0,0,0.4)] relative text-gray-900 dark:text-gray-100', shaking ? 'animate-shake' : '']"
            @keydown="handleKeydown"
            tabindex="-1"
          >
            <!-- macOS 风格窗口控制按钮 -->
            <div class="absolute top-4 left-4">
              <MacWindowControls 
                :show-close="true"
                :show-minimize="false"
                :show-maximize="false"
                :clickable="true"
                close-title="关闭"
                @close="closeDialog"
              />
            </div>

            <!-- 标题 -->
            <div class="flex flex-col items-center mb-6 pt-4">
              <div class="w-16 h-16 rounded-full bg-linear-to-br from-[#ce8256] to-[#b8714a] flex items-center justify-center mb-4 shadow-lg">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-[#32241b] dark:text-gray-100 m-0 mb-2">需要管理员权限</h3>
              <p class="text-sm text-[#7a5a48] dark:text-gray-400 m-0 text-center">请输入管理员用户名和密码以访问编辑器</p>
            </div>

            <!-- 用户名输入框 -->
            <div class="mb-4">
              <div :class="['relative', error ? 'animate-shake' : '']">
                <input
                  ref="usernameInputRef"
                  v-model="username"
                  type="text"
                  placeholder="输入用户名"
                  :disabled="loading"
                  :class="[
                    'w-full px-4 py-3 border-2 rounded-xl bg-[#fffdf9] dark:bg-[#2b2d30] text-[#32241b] dark:text-gray-100 outline-none text-base transition-all duration-200',
                    loading ? 'opacity-50 cursor-not-allowed' : '',
                    error 
                      ? 'border-[#ff5f57] focus:border-[#ff5f57] focus:shadow-[0_0_0_4px_rgba(255,95,87,0.15)]' 
                      : 'border-[rgba(121,82,57,0.16)] dark:border-[#3a3c3f] focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]'
                  ]"
                  @keydown="handleUsernameKeydown"
                >
              </div>
            </div>

            <!-- 密码输入框 -->
            <div class="mb-6">
              <div :class="['relative', error ? 'animate-shake' : '']">
                <input
                  ref="passwordInputRef"
                  v-model="password"
                  type="password"
                  placeholder="输入密码"
                  :disabled="loading"
                  :class="[
                    'w-full px-4 py-3 border-2 rounded-xl bg-[#fffdf9] dark:bg-[#2b2d30] text-[#32241b] dark:text-gray-100 outline-none text-base transition-all duration-200',
                    loading ? 'opacity-50 cursor-not-allowed' : '',
                    error 
                      ? 'border-[#ff5f57] focus:border-[#ff5f57] focus:shadow-[0_0_0_4px_rgba(255,95,87,0.15)]' 
                      : 'border-[rgba(121,82,57,0.16)] dark:border-[#3a3c3f] focus:border-[#cb7d52] focus:shadow-[0_0_0_4px_rgba(203,125,82,0.12)]'
                  ]"
                  @keydown="(e: KeyboardEvent) => {
                    if (!e.isComposing && e.key === 'Enter') {
                      e.preventDefault()
                      verifyPassword()
                    }
                  }"
                >
                <!-- 加载图标 -->
                <svg 
                  v-if="loading" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#cb7d52] animate-spin" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <!-- 错误提示图标 -->
                <svg 
                  v-else-if="error" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ff5f57]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p v-if="error" class="text-[#ff5f57] text-xs mt-2 ml-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ errorMessage }}
              </p>
            </div>

            <!-- 按钮组 -->
            <div class="flex gap-3">
              <button 
                class="flex-1 px-5 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-[#2b2d30] text-[#6f4c39] dark:text-gray-100 hover:bg-[#e0e0e0] dark:hover:bg-[#3a3c3f] active:scale-95"
                @click="closeDialog"
              >
                取消
              </button>
              <button 
                class="flex-1 px-5 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a] active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ce8256]"
                :disabled="loading"
                @click="verifyPassword"
              >
                {{ loading ? '验证中...' : '确定' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 对话框滑入动画 */
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.dialog-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

/* 抖动动画 */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
</style>
