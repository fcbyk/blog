<script setup lang="ts">
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置 NProgress
NProgress.configure({
  showSpinner: false,  // 不显示加载圆圈
  easing: 'ease',      // 动画效果
  speed: 400,          // 动画速度
  minimum: 0.2         // 最小百分比
})

// 导出方法供外部使用
const startLoading = () => NProgress.start()
const endLoading = () => NProgress.done()

defineExpose({
  startLoading,
  endLoading
})
</script>

<template></template>

<style>
/* 自定义进度条样式 */
#nprogress .bar {
  background: #4f46e5 !important;
  /* 使用主题色 */
  height: 3px !important;
}

/* 去除进度条的模糊效果 */
#nprogress .peg {
  box-shadow: none !important;
}
</style>
