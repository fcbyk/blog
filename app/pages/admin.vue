<script setup lang="ts">
const { isLoggedIn, isChecking, checkAuth, login: doLogin, logout: doLogout } = useAuth()

const password = ref('')
const error = ref(false)
const errorMessage = ref('')
const loading = ref(false)
const shaking = ref(false)
const passwordInputRef = ref<HTMLInputElement | null>(null)

watch(password, () => {
  if (error.value) {
    error.value = false
    errorMessage.value = ''
  }
})

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) {
    nextTick(() => {
      passwordInputRef.value?.focus()
    })
  }
})

async function handleLogin() {
  if (!password.value) {
    error.value = true
    errorMessage.value = '请输入密码'
    triggerShake()
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; message?: string; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    })

    if (response.success && response.token) {
      doLogin(response.token)
      password.value = ''
    } else {
      error.value = true
      errorMessage.value = response.message || '密码错误，请重试'
      triggerShake()
      setTimeout(() => {
        passwordInputRef.value?.focus()
      }, 300)
    }
  } catch (err) {
    console.error('登录失败:', err)
    error.value = true
    errorMessage.value = '验证失败，请稍后重试'
    triggerShake()
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  doLogout()
  nextTick(() => {
    passwordInputRef.value?.focus()
  })
}

function handleClose() {
  navigateTo('/')
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => {
    shaking.value = false
  }, 500)
}

function handleKeydown(event: KeyboardEvent) {
  if (!event.isComposing && event.key === 'Enter') {
    event.preventDefault()
    handleLogin()
  }
}
</script>

<template>
  <div class="h-full flex items-center justify-center">
    <!-- 检查中：加载状态 -->
    <div v-if="isChecking" class="flex items-center gap-2 text-[#7a5a48] dark:text-gray-400">
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="text-sm">检查登录状态...</span>
    </div>

    <!-- 已登录 -->
    <div
      v-else-if="isLoggedIn"
      class="relative bg-[rgb(250_250_250)] dark:bg-[#1a1c1e] rounded-2xl p-8 w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_80px_rgba(0,0,0,0)] text-gray-900 dark:text-gray-100"
    >
      <div class="absolute top-4 left-4">
        <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="handleClose" />
      </div>
      <div class="flex flex-col items-center pt-4">
        <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-[#32241b] dark:text-gray-100 m-0 mb-2">已登录</h3>
        <p class="text-sm text-[#7a5a48] dark:text-gray-400 m-0 mb-6">30 天内有效</p>
        <button
          class="px-6 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ff5f57] text-white hover:bg-[#e04e46] active:scale-95 shadow-md"
          @click="handleLogout"
        >
          退出登录
        </button>
      </div>
    </div>

    <!-- 登录表单 -->
    <div
      v-else
      :class="[
        'relative bg-[rgb(250_250_250)] dark:bg-[#1a1c1e] rounded-2xl p-8 w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_80px_rgba(0,0,0,0)] text-gray-900 dark:text-gray-100',
        shaking ? 'animate-shake' : ''
      ]"
    >
      <div class="absolute top-4 left-4">
        <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="handleClose" />
      </div>
      <div class="flex flex-col items-center mb-6 pt-4">
        <div class="w-16 h-16 rounded-full bg-linear-to-br from-[#ce8256] to-[#b8714a] flex items-center justify-center mb-4 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-[#32241b] dark:text-gray-100 m-0 mb-2">管理员登录</h3>
        <p class="text-sm text-[#7a5a48] dark:text-gray-400 m-0 text-center">请输入管理员密码</p>
      </div>

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
          @keydown="handleKeydown"
        >
        <svg
          v-if="loading"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#cb7d52] animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
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

      <button
        class="w-full mt-4 px-5 py-2.5 border-none rounded-xl text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a] active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ce8256]"
        :disabled="loading"
        @click="handleLogin"
      >
        {{ loading ? '验证中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
</style>