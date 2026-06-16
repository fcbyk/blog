<template>
  <div class="h-full w-full flex items-center justify-center">
    <div
      ref="chatWindowRef"
      class="chat-window-shell chat-window-chroma relative z-10 w-full h-full md:w-[50%] md:h-[80%] rounded-none md:rounded-2xl"
      @mousemove="handleWindowMove"
      @mouseenter="handleWindowEnter"
      @mouseleave="handleWindowLeave"
    >
      <!-- macOS 风格窗口 -->
      <div
        class="chat-window relative w-full h-full rounded-none md:rounded-[14px] bg-[rgb(250_250_250)] dark:bg-[#1a1c1e] overflow-hidden flex flex-col shadow-none md:shadow-xl dark:shadow-none"
      >
        <!-- 窗口标题栏 - 在移动端隐藏 -->
        <div class="title-bar h-7.5 relative items-center px-4 cursor-move select-none hidden md:flex">
          <!-- 左上角三个按钮（仅装饰） -->
          <div class="absolute left-3.75 top-1/2 -translate-y-1/2">
            <MacWindowControls 
              :show-close="true"
              :show-minimize="true"
              :show-maximize="true"
              :clickable="false"
            />
          </div>
        </div>

        <!-- 窗口内容区域 -->
        <div class="main flex-1 overflow-hidden flex flex-col mt-8 md:mt-0">
          <!-- 请求失败，显示错误和重试按钮 -->
          <div v-if="appStore.isError" class="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div class="flex flex-col items-center gap-3">
              <IconDatabaseError class="w-10 h-10 text-[#ccc] dark:text-[#444]" />
              <p class="text-sm text-[#999] dark:text-[#666] m-0">数据库连接异常</p>
            </div>
            <button
              @click="handleRetry"
              class="px-5 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all duration-200 bg-[#f0f0f0] dark:bg-[#2b2d30] text-[#555] dark:text-[#aaa] hover:bg-[#e4e4e4] dark:hover:bg-[#363839]"
            >
              重新加载
            </button>
          </div>

          <!-- 配置数据加载中 -->
          <div v-else-if="!appStore.isReady" class="flex-1 flex flex-col items-center justify-center gap-6">
            <span class="loading-17"></span>
            <p class="text-sm text-[#999] dark:text-[#666] m-0">获取数据中，{{ countdown }}秒后超时</p>
          </div>

          <template v-else>
            <!-- 消息展示区域 -->
            <MessageList />
            
            <!-- 底部输入区域 -->
            <BottomBar />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const chatWindowRef = ref<HTMLElement | null>(null)
const messageStore = useMessageStore()
const appStore = useAppStore()
const { initDatas } = useAppDataManager()

const TIMEOUT_SECONDS = 10
const countdown = ref(TIMEOUT_SECONDS)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  clearCountdown()
  countdown.value = TIMEOUT_SECONDS
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) countdown.value--
  }, 1000)
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// 加载状态变化时控制倒计时
watch(
  () => [appStore.isReady, appStore.isError] as const,
  ([ready, error]) => {
    if (!ready && !error) {
      startCountdown()
    } else {
      clearCountdown()
    }
  },
  { immediate: true }
)

onUnmounted(clearCountdown)

async function handleRetry() {
  appStore.setError(false)
  appStore.setLoading(true)
  await initDatas(true)
}

const handleWindowMove = (event: MouseEvent) => {
  const el = chatWindowRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  el.style.setProperty('--mx', `${x}px`)
  el.style.setProperty('--my', `${y}px`)
}

const handleWindowEnter = () => {
  const el = chatWindowRef.value
  if (!el) return
  el.style.setProperty('--spot-opacity', '0.9')
}

const handleWindowLeave = () => {
  const el = chatWindowRef.value
  if (!el) return
  el.style.setProperty('--spot-opacity', '0')
}
</script>

<style>
@media (max-width: 767px) {
  .chat-window-chroma::before,
  .chat-window-chroma::after {
    content: none !important;
  }
}

@media (min-width: 768px) {
  html.dark .chat-window-chroma {
    isolation: isolate;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  html.dark .chat-window {
    position: relative;
    z-index: 3;
  }

  /* .chat-window {
    box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.4);
    
  } */

  html.dark .chat-window-chroma {
    --mx: 50%;
    --my: 0%;
    --spot-opacity: 0;
  }

  html.dark .chat-window-chroma::before,
  html.dark .chat-window-chroma::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    pointer-events: none;
    padding: 2px;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    z-index: 2;
  }

  /* 基础低彩边框（单边框系统） */
  html.dark .chat-window-chroma::before {
    background:
      linear-gradient(
        135deg,
        rgba(82, 108, 188, 0.34) 0%,
        rgba(72, 100, 184, 0.3) 38%,
        rgba(72, 186, 197, 0.28) 72%,
        rgba(77, 206, 183, 0.3) 100%
      ) border-box;
  }

  /* 鼠标跟随的柔和高亮，与基础边框在同一圈 */
  html.dark .chat-window-chroma::after {
    opacity: var(--spot-opacity);
    transition: opacity 0.22s ease;
    mix-blend-mode: screen;
    background:
      radial-gradient(
        260px circle at var(--mx) var(--my),
        rgba(126, 240, 255, 0.56) 0%,
        rgba(90, 205, 255, 0.33) 34%,
        rgba(74, 168, 255, 0.11) 56%,
        rgba(74, 168, 255, 0) 80%
      ) border-box;
  }
}

.loading-17 {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  color: #666;
  left: -100px;
  animation: loading-17 2s linear infinite;
}

@keyframes loading-17 {
  0% {
    box-shadow: 0 0 #fff0, 0 0 #fff0, 0 0 #fff0, 0 0 #fff0;
  }
  12% {
    box-shadow: 100px 0 #666, 0 0 #fff0, 0 0 #fff0, 0 0 #fff0;
  }
  25% {
    box-shadow: 110px 0 #666, 100px 0 #666, 0 0 #fff0, 0 0 #fff0;
  }
  36% {
    box-shadow: 120px 0 #666, 110px 0 #666, 100px 0 #666, 0 0 #fff0;
  }
  50% {
    box-shadow: 130px 0 #666, 120px 0 #666, 110px 0 #666, 100px 0 #666;
  }
  62% {
    box-shadow: 200px 0 #fff0, 130px 0 #666, 120px 0 #666, 110px 0 #666;
  }
  75% {
    box-shadow: 200px 0 #fff0, 200px 0 #fff0, 130px 0 #666, 120px 0 #666;
  }
  87% {
    box-shadow: 200px 0 #fff0, 200px 0 #fff0, 200px 0 #fff0, 130px 0 #666;
  }
  to {
    box-shadow: 200px 0 #fff0, 200px 0 #fff0, 200px 0 #fff0, 200px 0 #fff0;
  }
}
</style>
