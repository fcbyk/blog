<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const emit = defineEmits<{
  (e: 'openSidebar'): void
}>()

const route = useRoute()
const editorStore = useEditorStore()
const navStore = useNavStore()
const showMenu = ref(false)
const showDataMenu = ref(false)
const showNavMenu = ref(false)
const currentDateTime = ref('')

const isOnQAPage = computed(() => route.path.startsWith('/q/'))
const isOnEditor = computed(() => route.path === '/editor')
const isOnNav = computed(() => route.path === '/nav')

let timer: ReturnType<typeof setInterval> | null = null

const formatDateTime = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[now.getDay()]
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentDateTime.value = `${month}月${day}日 ${weekDay} ${hours}:${minutes}`
}

const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const hideMenu = () => {
  showMenu.value = false
}

const hideDataMenu = () => {
  showDataMenu.value = false
}

const handleImport = () => {
  showDataMenu.value = false
  editorStore.openImportPopup()
}

const handleExport = async () => {
  showDataMenu.value = false
  const ok = await editorStore.exportAllData()
  if (!ok) {
    alert('导出失败，请重试')
  }
}

const handleClear = () => {
  showDataMenu.value = false
  if (confirm('确定要清空所有编辑器数据吗？此操作不可撤销。')) {
    editorStore.clearAllData()
  }
}

/* Nav 菜单（/nav 页面） */
const hideNavMenu = () => {
  showNavMenu.value = false
}

const handleNavEdit = () => {
  navStore.toggleEdit()
  showNavMenu.value = false
}
const handleNavImport = () => {
  navStore.dispatch('import')
  showNavMenu.value = false
}
const handleNavExport = () => {
  navStore.dispatch('export')
  showNavMenu.value = false
}
const handleNavClear = () => {
  navStore.dispatch('clear')
  showNavMenu.value = false
}

const openSidebar = () => {
  emit('openSidebar')
}

onMounted(() => {
  formatDateTime()
  timer = setInterval(formatDateTime, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 z-50 bg-white/0 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none text-gray-800 dark:text-gray-100">
    <div class="flex items-center md:space-x-4">
      <div class="flex items-center">
        <img src="/favicon.svg" alt="Logo" class="w-5 h-5" />
      </div>

      <div class="relative hidden md:block" @mouseenter="showMenu = true" @mouseleave="hideMenu">
        <button
          class="text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors cursor-default"
          @click="toggleMenu"
        >
          非常不愉快
        </button>

        <div
          v-show="showMenu"
          class="absolute top-full left-0 w-48 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl rounded-lg py-1 overflow-hidden border border-gray-200 dark:border-[#2b2d30] shadow-sm"
        >
          <NuxtLink
            :to="isOnQAPage ? route.fullPath : '/'"
            class="flex items-center space-x-3 px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors"
            @click="showMenu = false"
          >
            <IconHome />
            <span>Q&A</span>
          </NuxtLink>

          <button
            class="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="showMenu = false; navigateTo('/blog')"
          >
            <IconBlog />
            <span>Blog</span>
          </button>
        </div>
      </div>

      <!-- 编辑器数据菜单（仅编辑器页面显示） -->
      <div v-if="isOnEditor" class="relative hidden md:block" @mouseenter="showDataMenu = true" @mouseleave="hideDataMenu">
        <button
          class="text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors cursor-default"
          @click="showDataMenu = !showDataMenu"
        >
          Editor
        </button>

        <div
          v-show="showDataMenu"
          class="absolute top-full left-0 w-36 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl rounded-lg py-1 overflow-hidden border border-gray-200 dark:border-[#2b2d30] shadow-sm"
        >
          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="handleImport"
          >
            导入数据
          </button>

          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="handleExport"
          >
            导出数据
          </button>

          <div class="border-t border-gray-200 dark:border-[#2b2d30] my-1"></div>

          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors border-none cursor-pointer"
            @click="handleClear"
          >
            清空数据
          </button>
        </div>
      </div>

      <!-- Nav 菜单（仅书签管理页显示） -->
      <div v-if="isOnNav" class="relative hidden md:block" @mouseenter="showNavMenu = true" @mouseleave="hideNavMenu">
        <button
          class="text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors cursor-default"
          @click="showNavMenu = !showNavMenu"
        >
          书签
        </button>

        <div
          v-show="showNavMenu"
          class="absolute top-full left-0 w-32 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl rounded-lg py-1 overflow-hidden border border-gray-200 dark:border-[#2b2d30] shadow-sm"
        >
          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="handleNavEdit"
          >
            {{ navStore.editMode ? '✓ 完成编辑' : '编辑模式' }}
          </button>

          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="handleNavImport"
          >
            导入书签
          </button>

          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors border-none cursor-pointer"
            @click="handleNavExport"
          >
            导出书签
          </button>

          <div class="border-t border-gray-200 dark:border-[#2b2d30] my-1"></div>

          <button
            class="flex items-center w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors border-none cursor-pointer"
            @click="handleNavClear"
          >
            清空书签
          </button>
        </div>
      </div>

      <button
        class="md:hidden text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors"
        @click="openSidebar"
      >
        非常不愉快
      </button>
    </div>

    <div class="flex items-center space-x-4">
      <button
        @click="toggleTheme"
        class="hidden md:flex p-1 hover:bg-white/20 rounded transition-colors"
        :title="isDark ? '切换到日间模式' : '切换到夜间模式'"
      >
        <IconSun v-if="!isDark" />
        <IconMoon v-else />
      </button>

      <span class="text-sm font-medium">{{ currentDateTime }}</span>
    </div>
  </div>


</template>

