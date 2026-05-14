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
          
          <!-- 居中显示正在输入状态 -->
          <div class="flex-1 text-center text-xs text-gray-600 dark:text-gray-400">
            {{ messageStore.isTyping ? '正在输入...' : '' }}
          </div>
        </div>

        <!-- 窗口内容区域 -->
        <div class="main flex-1 overflow-hidden flex flex-col mt-8 md:mt-0">
          <!-- 消息展示区域 -->
          <MessageList />
          
          <!-- 底部输入区域 -->
          <BottomBar />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const chatWindowRef = ref<HTMLElement | null>(null)
const messageStore = useMessageStore()

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
</style>
