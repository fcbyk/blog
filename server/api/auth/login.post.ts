import { generateToken } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  try {
    const body = await readBody(event)
    const { password } = body

    if (!password) {
      return { success: false, message: '密码不能为空' }
    }

    const adminPassword = process.env.NUXT_ADMIN_PASSWORD || ''

    if (!adminPassword) {
      return { success: false, message: '未配置管理员密码' }
    }

    if (password === adminPassword) {
      const token = generateToken()
      return { success: true, token }
    } else {
      return { success: false, message: '密码错误' }
    }
  } catch (error) {
    console.error('登录验证失败:', error)
    return { success: false, message: '验证失败，请稍后重试' }
  }
})