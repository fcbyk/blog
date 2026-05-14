<script setup>
const props = defineProps({
    role: {
        type: String,
        required: true,
        validator: (value) => ['user', 'bot'].includes(value)
    }
})

const appStore = useAppStore()
const imageError = ref(false)

// 获取头像 URL - 从配置 store 中获取
const avatarUrl = computed(() => {
    if (!appStore.datas?.baseConfig?.avatar) return ''
    return props.role === 'bot' ? appStore.datas.baseConfig.avatar.bot : appStore.datas.baseConfig.avatar.user
})

// 计算头像字母：A 对应 bot，Q 对应 user
const avatarLetter = computed(() => {
    return props.role === 'bot' ? 'A' : 'Q'
})

// 处理图片加载错误
const handleImageError = () => {
    imageError.value = true
}
</script>

<template>
    <div class="message-container flex gap-2 max-w-[90%]" :class="{
        'user-message flex-row-reverse self-end': role === 'user',
        'my-message self-start': role === 'bot'
    }">

        <div class="avatar-container w-10 h-10 rounded-sm overflow-hidden shrink-0">
            <!-- 尝试显示图片头像 -->
            <img 
                v-if="avatarUrl && !imageError" 
                class="avatar-image object-cover w-full h-full" 
                :src="avatarUrl" 
                :alt="role" 
                @error="handleImageError"
            />
            <!-- 图片加载失败或未配置时显示字母头像 -->
            <div v-else class="avatar-letter w-full h-full flex items-center justify-center text-white font-bold text-lg" :class="role">
                {{ avatarLetter }}
            </div>
        </div>

        <slot></slot>

    </div>
</template>



<style scoped>
.avatar-letter {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-letter.bot {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-letter.user {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

:global(.dark) .avatar-letter.bot {
    background: linear-gradient(135deg, #5f646b 0%, #454a50 100%);
}

:global(.dark) .avatar-letter.user {
    background: linear-gradient(135deg, #89df61 0%, #77c754 100%);
}
</style>
