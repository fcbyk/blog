<script setup lang="ts">
const showSidebar = ref(false)
const appDataManager = useAppDataManager()

onMounted(() => {
  // 后台加载配置数据，不阻塞页面渲染
  // 各页面自行判断 appStore.isReady 决定加载状态
  appDataManager.initDatas()
})
</script>

<template>
  <div class="h-dvh relative overflow-hidden flex flex-col z-10 transition-colors duration-300">
    <ClientOnly>
      <MacMenuBar @open-sidebar="showSidebar = true" />
      <MobileSidebar v-model="showSidebar" />
    </ClientOnly>
    <NuxtPage
      :page-key="(r) => (r.fullPath as string).startsWith('/blog') ? '/blog' : r.fullPath"
      :transition="{ name: 'page-pop', appear: true, mode: 'out-in' }"
    />
  </div>
</template>

<style>
/* 优化的页面过渡动画 - 更丝滑的弹出效果 */
.page-pop-enter-active,
.page-pop-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  will-change: opacity, transform;
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* 进入状态：从下方淡入并轻微放大 */
.page-pop-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

/* 离开状态：向上淡出并轻微缩小 */
.page-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

/* 针对不同页面的特殊处理 */
.page-pop-enter-active .mac-window,
.page-pop-leave-active .mac-window {
  transition: inherit;
}

/* 确保页面容器有平滑的背景过渡 */
.page-pop-enter-active > div,
.page-pop-leave-active > div {
  transition: background-color 0.3s ease;
}

/* 移动端优化 - 减少动画幅度 */
@media (max-width: 768px) {
  .page-pop-enter-from {
    transform: translateY(8px) scale(0.99);
  }
  
  .page-pop-leave-to {
    transform: translateY(-4px) scale(0.98);
  }
}
</style>
