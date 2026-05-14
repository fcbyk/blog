<script setup lang="ts">
import type { MessageRole, NavContent } from '~~/shared/types/message'

defineProps({
    role: {
        type: String as () => MessageRole,
        required: true
    },
    content: {
        type: Object as () => NavContent,
        required: true,
        validator: (value: any) => {
            return value && typeof value.title === 'string' && typeof value.link === 'string'
        }
    }
})
</script>

<template>
    <div class="bookmark-message relative max-w-[80%] mb-2" :class="{
        'ml-10': role === 'user',
        'mr-10': role === 'bot'
    }">
        <a :href="content.link" target="_blank" rel="noopener noreferrer" class="bookmark-container flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-500 transition-colors duration-200 overflow-hidden no-underline text-inherit">
            <!-- 上部分：图标和内容 -->
            <div class="bookmark-main flex items-start gap-3 p-3">
                <div v-if="content.icon" class="bookmark-icon shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <img v-if="typeof content.icon === 'string'" :src="content.icon" alt="网站图标" class="w-full h-full object-cover" />
                    <div v-else class="default-icon text-gray-400 dark:text-gray-500">
                        <IconExternalLink />
                    </div>
                </div>

                <div class="bookmark-content flex-1 min-w-0">
                    <div class="bookmark-title text-base font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">{{ content.title }}</div>
                    <div v-if="content.desc" class="bookmark-desc text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{{ content.desc }}</div>
                </div>
            </div>

            <!-- 分割线 -->
            <div class="bookmark-divider bg-gray-200 dark:bg-slate-700 w-full"></div>

            <!-- 下部分：链接 -->
            <div class="bookmark-link flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <IconExternalLink class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <span class="truncate">{{ content.link }}</span>
            </div>
        </a>
    </div>
</template>


