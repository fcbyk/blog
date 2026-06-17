<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const emit = defineEmits<{
  (e: 'openSidebar'): void
}>()

const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const openSidebar = () => {
  emit('openSidebar')
}
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-10 flex items-center px-4 z-50 bg-white/0 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none text-gray-800 dark:text-gray-100">
    <button
      class="md:hidden text-sm px-2 py-1 hover:bg-white/20 rounded transition-colors"
      @click="openSidebar"
    >
      菜单
    </button>
    <div class="flex-1" />
    <button
      @click="toggleTheme"
      class="flex p-1 hover:bg-white/20 rounded transition-colors"
      :title="isDark ? '切换到日间模式' : '切换到夜间模式'"
    >
      <span v-if="!isDark">☀️</span>
      <span v-else>🌙</span>
    </button>
  </div>
</template>
