<script setup lang="ts">
import type { MessageRole, MessageStatus } from '~~/shared/types/message'

defineProps({
    role: {
        type: String as () => MessageRole,
        required: true,
        default: 'user'
    },
    status: {
        type: String as () => MessageStatus,
        required: true,
        default: 'loading'
    },
    content: {
        type: String,
        required: true,
        default: ''
    }
})
</script>

<template>
    <div class="text-message" :class="{
        'bg-(--user-message-bg) ml-10 rounded-br-none user-message-arrow ': role === 'user',
        'bg-(--my-message-bg) mr-10 rounded-bl-none my-message-arrow': role === 'bot',
        'text-[#191919]': role === 'user',
        'text-[#191919] dark:text-[#e8eaed]': role === 'bot',
        'opacity-80': status === 'loading'
    }">

        <div class="flex justify-center gap-1 mt-2" v-if="status === 'loading'">
            <div class="w-2 h-2 bg-(--text-secondary) rounded-full animate-message-pulse"></div>
            <div class="w-2 h-2 bg-(--text-secondary) rounded-full animate-message-pulse animation-delay-200"></div>
            <div class="w-2 h-2 bg-(--text-secondary) rounded-full animate-message-pulse animation-delay-400"></div>
        </div>

        <div class="leading-normal wrap-break-word whitespace-pre-wrap" v-else>{{ content }}</div>
    </div>
</template>

<style scoped>
.text-message {
    border-radius: 8px;
    padding: 10px 14px;
    max-width: 100%;
    box-shadow: 0 1px 1px var(--shadow-light);
    position: relative;
}
</style>
