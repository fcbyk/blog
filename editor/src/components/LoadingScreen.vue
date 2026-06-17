<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: 'FCBYK' })
</script>

<template>
  <div class="loader-container">
    <p class="loader"><span>{{ text }}</span></p>
  </div>
</template>

<style scoped>
.loader-container { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; }
.loader { color: #fcffdf; font-size: 50px; font-family: inherit; position: relative; font-style: italic; font-weight: 600; margin: 0; padding: 0 10px; display: inline-block; }
.dark .loader-container { background: #111315; }
.loader span { animation: cut 2s infinite; transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.loader:hover { color: #fcffdf; }
.loader::after { position: absolute; content: ""; width: 100%; height: 6px; border-radius: 4px; background-color: rgba(252, 255, 223, 0.57); top: 0px; animation: scan 2s infinite; left: 0; z-index: 0; transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.loader::before { position: absolute; content: ""; width: 100%; height: 5px; border-radius: 4px; background-color: #fcffdf; top: 0px; animation: scan 2s infinite; left: 0; z-index: 1; filter: opacity(0.9); transition: 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes scan { 0% { top: 0px; } 25% { top: 54px; } 50% { top: 0px; } 75% { top: 54px; } }
@keyframes cut { 0% { clip-path: inset(0 -10% 0 -10%); } 25% { clip-path: inset(100% -10% 0 -10%); } 50% { clip-path: inset(0 -10% 100% -10%); } 75% { clip-path: inset(0 -10% 0 -10%); } }
</style>
