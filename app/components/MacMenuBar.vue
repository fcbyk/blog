<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const emit = defineEmits<{
  (e: 'openSidebar'): void
}>()

const route = useRoute()
const showMenu = ref(false)
const currentDateTime = ref('')

const isOnQAPage = computed(() => route.path.startsWith('/q/'))

let hideTimer: ReturnType<typeof setTimeout> | null = null
let timer: ReturnType<typeof setInterval> | null = null

const isAdminVerified = computed(() => {
  const isVerified = useCookie('admin-verified', {
    maxAge: 60 * 30,
    sameSite: 'strict'
  })
  return !!isVerified.value
})

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

const hideMenuWithDelay = () => {
  hideTimer = setTimeout(() => {
    showMenu.value = false
  }, 200)
}

const cancelHide = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

const editorStore = useEditorStore()

const handleLogout = () => {
  const verifiedCookie = useCookie('admin-verified', {
    maxAge: 60 * 30,
    sameSite: 'strict'
  })
  verifiedCookie.value = null
  showMenu.value = false
  navigateTo('/')
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
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 z-50 bg-white/0 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none text-gray-800 dark:text-gray-100">
    <div class="flex items-center md:space-x-4">
      <div class="flex items-center">
        <img src="/favicon.svg" alt="Logo" class="w-5 h-5" />
      </div>

      <div class="relative hidden md:block" @mouseenter="showMenu = true" @mouseleave="hideMenuWithDelay">
        <button
          class="text-sm font-medium hover:bg-white/20 px-2 py-1 rounded transition-colors cursor-default"
          @click="toggleMenu"
        >
          非常不愉快
        </button>

        <div
          v-show="showMenu"
          class="absolute top-full left-0 mt-1 w-48 bg-white/90 dark:bg-[#1a1c1e]/95 backdrop-blur-xl rounded-lg py-1 overflow-hidden border border-gray-200 dark:border-[#2b2d30] shadow-sm"
          @mouseenter="cancelHide"
          @mouseleave="hideMenuWithDelay"
        >
          <NuxtLink
            :to="isOnQAPage ? route.fullPath : '/'"
            class="flex items-center space-x-3 px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors"
            @click="showMenu = false"
          >
            <IconHome />
            <span>Q&A</span>
          </NuxtLink>
          

          <NuxtLink
            v-if="isAdminVerified"
            to="/editor"
            class="flex items-center space-x-3 px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-indigo-600 dark:hover:text-[#ebedf0] transition-colors"
            @click="showMenu = false"
          >
            <IconSettings />
            <span>编辑器</span>
          </NuxtLink>
                
          <button
            v-if="isAdminVerified"
            @click="handleLogout"
            class="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-[#2f3237] hover:text-red-600 dark:hover:text-[#ff7f7f] transition-colors border-none cursor-pointer"
          >
            <IconLogout />
            <span>退出登录</span>
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

