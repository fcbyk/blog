import { generateToken } from '~~/server/utils/auth'
import md5 from 'md5'

export default defineEventHandler(async (event) => {
  // 只接受 POST 请求
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    // 获取请求体中的用户名和密码
    const body = await readBody(event)
    const { username, password } = body

    if (!username || !password) {
      return {
        success: false,
        message: '用户名和密码不能为空'
      }
    }

    // 从环境变量获取管理员用户名和密码（MD5 加密后的字符串）
    const adminUsernameMd5 = useRuntimeConfig().adminUsername
    const adminPasswordMd5 = useRuntimeConfig().adminPassword

    // 将用户输入的用户名和密码转换为 MD5
    const inputUsernameMd5 = md5(String(username))
    const inputPasswordMd5 = md5(String(password))

    // 验证用户名和密码（比对 MD5 值）
    if (inputUsernameMd5 === adminUsernameMd5 && inputPasswordMd5 === adminPasswordMd5) {
      // 生成 JWT token
      const token = generateToken()
      
      return {
        success: true,
        message: '验证成功',
        token // 返回 token 供后续请求使用
      }
    } else {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }
  } catch (error) {
    console.error('密码验证失败:', error)
    return {
      success: false,
      message: '验证失败，请稍后重试'
    }
  }
})
