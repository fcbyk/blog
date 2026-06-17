<script setup lang="ts">
import type { EditorPage } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const editorStore = useEditorStore()

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleNavigateToPage = (page: EditorPage) => {
  editorStore.setActivePage(page)
  handleClose()
}

</script>

<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-60 md:hidden"
      @click="handleClose"
    />
  </Transition>

  <Transition name="slide">
    <aside
      v-if="modelValue"
      class="fixed top-0 left-0 h-full w-64 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl z-70 shadow-lg md:hidden flex flex-col text-gray-800 dark:text-[#ebedf0]"
    >
      <nav class="flex-1 overflow-y-auto pt-4">
        <div class="px-4 space-y-2">
          <button
            @click="handleNavigateToPage('base')"
            :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'base' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
          >
            <span>⚙️</span>
            <span>基础设置</span>
          </button>
          <button
            @click="handleNavigateToPage('reply')"
            :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'reply' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
          >
            <span>💬</span>
            <span>回复规则</span>
          </button>
          <button
            @click="handleNavigateToPage('url')"
            :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'url' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
          >
            <span>🔗</span>
            <span>URL匹配</span>
          </button>
          <button
            @click="handleNavigateToPage('menu')"
            :class="['w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left', editorStore.activePage === 'menu' ? 'bg-indigo-50 dark:bg-[#2f3237] text-indigo-600 dark:text-[#ebedf0]' : 'hover:bg-indigo-50 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] text-gray-700 dark:text-[#c7cbd1]']"
          >
            <span>📋</span>
            <span>菜单设置</span>
          </button>
        </div>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-[#2b2d30]">
        <div class="text-xs text-gray-500 dark:text-[#8f949a] text-center">
          © 2026 非常不愉快
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
