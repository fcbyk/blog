export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    const body = await readBody(event)
    const { password } = body

    if (!password) {
      return { success: false, message: '密码不能为空' }
    }

    const editorPassword = process.env.NUXT_EDITOR_PASSWORD || ''

    if (!editorPassword) {
      return { success: false, message: '未配置编辑器密码' }
    }

    if (password === editorPassword) {
      return { success: true }
    } else {
      return { success: false, message: '密码错误' }
    }
  } catch (error) {
    console.error('密码验证失败:', error)
    return { success: false, message: '验证失败，请稍后重试' }
  }
})
