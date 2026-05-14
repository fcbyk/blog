<script setup lang="ts">
interface Props {
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 是否显示最小化按钮 */
  showMinimize?: boolean
  /** 是否显示最大化按钮 */
  showMaximize?: boolean
  /** 按钮是否可点击 */
  clickable?: boolean
  /** 关闭按钮的提示文字 */
  closeTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  showClose: true,
  showMinimize: false,
  showMaximize: false,
  clickable: false,
  closeTitle: '关闭'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 处理关闭事件
function handleClose() {
  if (props.clickable) {
    emit('close')
  }
}
</script>

<template>
  <div class="window-controls flex gap-1.25">
    <!-- 关闭按钮（红色） -->
    <button 
      v-if="showClose"
      class="control-dot w-3.75 h-3.75 rounded-full bg-[#ff5f57] border-none cursor-pointer flex items-center justify-center transition-all duration-200 hover:opacity-80 active:scale-95 p-0 group"
      :class="{ 'cursor-default': !clickable }"
      @click="handleClose"
      :title="closeTitle"
    >
      <span v-if="clickable" class="text-[#4d0000]/60 text-sm font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">×</span>
    </button>
    
    <!-- 最小化按钮（黄色） -->
    <div 
      v-if="showMinimize"
      class="control-dot w-3.75 h-3.75 rounded-full bg-[#febc2e] transition-opacity duration-200 hover:opacity-80"
      :class="{ 'cursor-pointer': clickable }"
    ></div>
    
    <!-- 最大化按钮（绿色） -->
    <div 
      v-if="showMaximize"
      class="control-dot w-3.75 h-3.75 rounded-full bg-[#28c840] transition-opacity duration-200 hover:opacity-80"
      :class="{ 'cursor-pointer': clickable }"
    ></div>
  </div>
</template>
