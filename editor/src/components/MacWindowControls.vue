<script setup lang="ts">
interface Props {
  showClose?: boolean
  showMinimize?: boolean
  showMaximize?: boolean
  clickable?: boolean
  closeTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  showClose: true,
  showMinimize: false,
  showMaximize: false,
  clickable: false,
  closeTitle: '关闭'
})

const emit = defineEmits<{ (e: 'close'): void }>()

function handleClose() {
  if (props.clickable) { emit('close') }
}
</script>

<template>
  <div class="window-controls flex gap-1.25">
    <button v-if="showClose" class="control-dot w-3.75 h-3.75 rounded-full bg-[#ff5f57] border-none cursor-pointer flex items-center justify-center transition-all duration-200 hover:opacity-80 active:scale-95 p-0 group" :class="{ 'cursor-default': !clickable }" @click="handleClose" :title="closeTitle">
      <span v-if="clickable" class="text-[#4d0000]/60 text-sm font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">×</span>
    </button>
    <div v-if="showMinimize" class="control-dot w-3.75 h-3.75 rounded-full bg-[#febc2e] transition-opacity duration-200 hover:opacity-80" :class="{ 'cursor-pointer': clickable }"></div>
    <div v-if="showMaximize" class="control-dot w-3.75 h-3.75 rounded-full bg-[#28c840] transition-opacity duration-200 hover:opacity-80" :class="{ 'cursor-pointer': clickable }"></div>
  </div>
</template>
