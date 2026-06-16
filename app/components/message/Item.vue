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

// 是否显示头像
const showAvatar = computed(() => {
    return !!avatarUrl.value && !imageError.value
})
</script>

<template>
    <div class="message-container flex gap-2 max-w-[90%]" :class="{
        'user-message flex-row-reverse self-end': role === 'user',
        'my-message self-start': role === 'bot'
    }">

        <div v-if="showAvatar" class="avatar-container w-10 h-10 rounded-sm overflow-hidden shrink-0">
            <img 
                class="avatar-image object-cover w-full h-full" 
                :src="avatarUrl" 
                :alt="role" 
                @error="imageError = true"
            />
        </div>

        <slot></slot>

    </div>
</template>
