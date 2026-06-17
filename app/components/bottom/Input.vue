<script setup lang="ts">
const messageStore = useMessageStore()
const sender = useMessageSender()
const matcher = useMessageMatcher()

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: '输入消息...'
    },
    maxRows: {
        type: Number,
        default: 6
    },
    disabled: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputValue = ref(props.modelValue)
const baseLineHeight = ref(24)

const isDisabled = computed(() => {
    return props.disabled || messageStore.isTyping
})

watch(() => props.modelValue, (newVal) => {
    inputValue.value = newVal
    adjustHeight()
})

const adjustHeight = () => {
    nextTick(() => {
        if (!textareaRef.value) return
        textareaRef.value.style.height = 'auto'
        const contentHeight = textareaRef.value.scrollHeight
        const maxHeight = baseLineHeight.value * props.maxRows
        textareaRef.value.style.height = `${Math.min(contentHeight, maxHeight)}px`
    })
}

const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    inputValue.value = target.value
    emit('update:modelValue', inputValue.value)
    adjustHeight()
}

const handleSubmit = async () => {
    if (!inputValue.value.trim() || isDisabled.value) return
    
    const msg = inputValue.value.trim()
    
    // 发送用户消息
    await sender.sendAsUser({ type: 'text', content: msg })
    
    // 清空输入
    inputValue.value = ''
    emit('update:modelValue', '')
    adjustHeight()
    
    // 检查关键词或正则回复
    const result = matcher.checkMatch(msg)
    if (result.matched) {
        await sender.sendBatchAs(result.messages, 'bot')
    }
}

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) {
        return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !isDisabled.value) {
        e.preventDefault()
        handleSubmit()
    }
}

onMounted(() => {
    if (textareaRef.value) {
        const style = window.getComputedStyle(textareaRef.value)
        baseLineHeight.value = parseInt(style.lineHeight) || 24
        adjustHeight()
    }
})
</script>

<template>
    <div class="bg-gray-50 dark:bg-[#1f2123] p-2 pl-0 min-h-12.5"> 
        <div class="flex items-end transition-all duration-200">
            <textarea 
                ref="textareaRef" 
                v-model="inputValue"
                class="flex-1 px-3 py-1.5 rounded-[5px] resize-none bg-white dark:bg-[#2b2d30] focus:outline-none text-gray-800 dark:text-[#ebedf0] placeholder-gray-400 dark:placeholder-[#8b9096] overflow-y-auto"
                :placeholder="placeholder" 
                :disabled="isDisabled" 
                rows="1" 
                @input="handleInput"
                @keydown="handleKeyDown" 
                :style="{
                    maxHeight: `${baseLineHeight * maxRows}px`
                }" 
            />
                
            <button 
                :disabled="!inputValue.trim() || isDisabled" 
                @click="handleSubmit"
                class="text-white w-7 h-7 mx-2 mb-1 flex items-center justify-center rounded-full transition-colors"
                :class="{
                    'bg-gray-300 dark:bg-[#4b5057] cursor-not-allowed': !inputValue.trim() || isDisabled,
                    'bg-[#07c160] hover:bg-[#06ad56] cursor-pointer': inputValue.trim() && !isDisabled
                }">
                <IconSend />
            </button>
        </div>
    </div>
</template>
