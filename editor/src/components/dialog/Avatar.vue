<script setup lang="ts">
interface Props {
  modelValue: boolean
  type: 'bot' | 'user'
  avatarUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', type: 'bot' | 'user', url: string): void
}>()

const tempUrl = ref('')
const avatarImageError = ref(false)

function openDialog() {
  tempUrl.value = props.avatarUrl || ''
  avatarImageError.value = false
}

function closeDialog() {
  emit('update:modelValue', false)
}

function confirmAvatarUrl() {
  emit('save', props.type, tempUrl.value)
  closeDialog()
}

function handleImageError() {
  avatarImageError.value = true
}

watch([() => props.modelValue, () => props.type], ([newValue]) => {
  if (newValue) { openDialog() }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center z-99999">
        <Transition name="dialog">
          <div v-if="modelValue" class="bg-white dark:bg-slate-900 rounded-2xl p-6 w-[90%] max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-gray-900 dark:text-gray-100">
            <div class="relative mb-5">
              <MacWindowControls :show-close="true" :show-minimize="false" :show-maximize="false" :clickable="true" close-title="关闭" @close="closeDialog" />
              <h3 class="text-lg text-[#32241b] dark:text-gray-100 m-0 text-center pl-8 font-semibold">{{ type === 'bot' ? '设置机器人头像' : '设置访客头像' }}</h3>
            </div>
            <div class="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#ce8256] mx-auto mb-5 bg-[#f5f5f5] dark:bg-slate-800 flex items-center justify-center transition-all duration-200 hover:border-[#b8714a] hover:shadow-[0_4px_12px_rgba(206,130,86,0.3)]">
              <img v-if="tempUrl && !avatarImageError" :src="tempUrl" alt="预览" class="w-full h-full object-cover" @error="handleImageError" />
              <div v-else-if="tempUrl && avatarImageError" class="w-full h-full flex flex-col items-center justify-center bg-[#fff3e0] text-center p-2">
                <span class="text-[24px] mb-1">⚠️</span>
                <span class="text-[#e65100] text-[10px] font-medium leading-tight">加载失败</span>
              </div>
              <div v-else class="w-full h-full flex items-center justify-center text-[48px] bg-linear-to-br from-[#f5f5f5] to-[#e0e0e0] dark:from-slate-800 dark:to-slate-700">
                <span>{{ type === 'bot' ? '🤖' : '👤' }}</span>
              </div>
            </div>
            <div class="mb-5">
              <label class="block text-sm text-[#7a5a48] dark:text-gray-400 mb-2 font-medium">头像 URL</label>
              <input type="text" v-model="tempUrl" placeholder="请输入图片URL" class="w-full px-3.5 py-3 border-2 border-[#e8ddd3] dark:border-slate-700 rounded-xl bg-[#fffdf9] dark:bg-slate-800 text-[#32241b] dark:text-gray-100 outline-none text-sm transition-all duration-200 focus:border-[#ce8256] focus:shadow-[0_0_0_3px_rgba(206,130,86,0.1)]" @keyup.enter="confirmAvatarUrl">
            </div>
            <div class="flex gap-3">
              <button class="flex-1 px-5 py-2.5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#f5f5f5] dark:bg-slate-800 text-[#6f4c39] dark:text-gray-100 hover:bg-[#e0e0e0] dark:hover:bg-slate-700" @click="closeDialog">取消</button>
              <button class="flex-1 px-5 py-2.5 border-none rounded-lg text-sm cursor-pointer transition-all duration-200 font-medium bg-[#ce8256] text-[#fff8f2] hover:bg-[#b8714a]" @click="confirmAvatarUrl">确定</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-enter-active, .dialog-leave-active { transition: all 0.3s ease; }
.dialog-enter-from, .dialog-leave-to { transform: translateY(-20px); opacity: 0; }
</style>
