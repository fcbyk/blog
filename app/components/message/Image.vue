<script setup lang="ts">
import type { MessageRole, MessageStatus } from '~~/shared/types/message'

const props = defineProps({
  role: {
    type: String as () => MessageRole,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String as () => MessageStatus,
    required: true
  }
})

const showPreview = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)
const loadStartTime = ref(0)
const minSkeletonMs = 220
const imageRef = ref<HTMLImageElement | null>(null)
let revealTimer: ReturnType<typeof setTimeout> | null = null

const canShowImage = computed(() => {
  return imageLoaded.value && !imageError.value
})

const markImageLoaded = () => {
  if (imageError.value) return
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
  const elapsed = Date.now() - loadStartTime.value
  const waitTime = Math.max(0, minSkeletonMs - elapsed)
  revealTimer = setTimeout(() => {
    imageLoaded.value = true
    revealTimer = null
  }, waitTime)
}

const syncImageLoadedFromDom = async () => {
  const img = imageRef.value
  if (!img) return
  if (img.complete && img.naturalWidth > 0) {
    markImageLoaded()
    return
  }

  // 某些场景下组件重挂载会错过 load 事件，decode 可作为兜底
  if (typeof img.decode === 'function') {
    try {
      await img.decode()
      if (img.naturalWidth > 0) {
        markImageLoaded()
      }
    } catch {
      // decode 失败时等待 onload/onerror 回调处理
    }
  }
}

const handleImageLoad = () => {
  markImageLoaded()
}

const handleImageError = () => {
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
  imageError.value = true
  imageLoaded.value = false
}

// 监听content的变化，重置加载状态
watch(() => props.content, async () => {
  imageLoaded.value = false
  imageError.value = false
  loadStartTime.value = Date.now()
  await nextTick()
  await syncImageLoadedFromDom()
})

// 监听status的变化
watch(() => props.status, async (newStatus) => {
  if (newStatus === 'completed' || newStatus === 'loading') {
    await nextTick()
    await syncImageLoadedFromDom()
  }
})

onMounted(async () => {
  loadStartTime.value = Date.now()
  if (!props.content) {
    imageLoaded.value = true
    return
  }

  await nextTick()
  await syncImageLoadedFromDom()
})

onUnmounted(() => {
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
})

const openPreview = () => {
  showPreview.value = true
  document.body.style.overflow = 'hidden'
}

const closePreview = () => {
  showPreview.value = false
  document.body.style.overflow = ''
}
</script>

<template>
  <div class="image-message relative max-w-[80%] mb-2" :class="{
    'ml-10': role === 'user',
    'mr-10': role === 'bot'
  }">
    <!-- 图片容器 -->
    <div class="image-container rounded-lg overflow-hidden max-w-75 max-h-75 relative">
      <img
        ref="imageRef"
        :src="content"
        alt="图片消息"
        class="image-content max-w-full max-h-full object-cover block rounded-lg cursor-pointer transition-transform duration-200 hover:scale-105"
        @click="openPreview"
        v-show="canShowImage"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <!-- 加载骨架屏 -->
      <div v-if="!canShowImage && !imageError" class="image-skeleton w-37.5 h-37.5 bg-gray-200 dark:bg-[#1a1c1e] rounded-lg overflow-hidden relative">
        <div class="skeleton-animation absolute inset-0"></div>
      </div>
      <div v-else-if="imageError" class="w-37.5 h-37.5 rounded-lg bg-gray-100 dark:bg-[#202224] text-gray-500 dark:text-gray-400 text-xs flex items-center justify-center">
        图片加载失败
      </div>
    </div>
  </div>

  <!-- 图片预览模态框 - 使用 Teleport 渲染到 body -->
  <Teleport to="body">
    <div v-if="showPreview" class="preview-modal fixed inset-0 bg-black/90 dark:bg-black/60 flex items-center justify-center z-9999" @click.self="closePreview">
      <div class="preview-content relative max-w-[90%] max-h-[90%]">
        <img :src="content" alt="预览图片" class="preview-image max-w-full max-h-[80vh] object-contain" />
        <button @click="closePreview" class="close-button absolute -top-10 right-0 bg-none border-none text-white cursor-pointer p-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 加载骨架屏样式 */
.skeleton-animation {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: skeleton-shine 1.5s infinite;
}

.dark .skeleton-animation {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0) 100%
  );
}

@keyframes skeleton-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.close-button svg {
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}
</style>
