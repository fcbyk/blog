<script setup lang="ts">
import DOMPurify from 'dompurify'
import type { MessageRole, MessageStatus } from '~~/shared/types/message'

const props = defineProps({
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

const sanitizedContent = computed(() => DOMPurify.sanitize(props.content))
</script>

<template>
    <div class="text-message" :class="{
        'bg-[#95ec69] ml-10 rounded-br-none user-message-arrow ': role === 'user',
        'bg-white mr-10 rounded-bl-none my-message-arrow': role === 'bot',
        'opacity-80': status === 'loading'
    }">

        <div class="flex justify-center gap-1 mt-2" v-if="status === 'loading'">
            <div class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-message-pulse"></div>
            <div class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-message-pulse animation-delay-200"></div>
            <div class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-message-pulse animation-delay-400"></div>
        </div>
        <div class="leading-normal wrap-break-word text-gray-900 dark:text-gray-100" v-else v-html="sanitizedContent"></div>
    </div>
</template>

<style scoped>
.text-message {
    border-radius: 8px;
    padding: 10px 14px;
    max-width: 100%;
    box-shadow: 0 1px 1px rgba(73, 73, 73, 0.1);
    position: relative;
}
</style>
