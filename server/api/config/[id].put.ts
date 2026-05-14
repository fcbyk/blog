import { updateConfig } from '~~/server/utils/database'
import { validateConfigId } from '~~/server/utils/validation'
import { verifyToken } from '~~/server/utils/auth'

/**
 * PUT /api/config/:id
 * 全量更新配置文档（需要鉴权）
 */
export default defineEventHandler(async (event) => {
  // 验证身份
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: '需要身份验证'
    })
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  
  if (!decoded) {
    throw createError({
      statusCode: 401,
      message: '无效的或已过期的 token'
    })
  }

  // 鉴权通过，继续处理
  const id = getRouterParam(event, 'id')
  
  // 验证 ID 是否存在
  if (!id) {
    throw createError({ 
      statusCode: 400, 
      message: 'Config ID is required' 
    })
  }
  
  // 验证 ID 合法性
  validateConfigId(id)
  
  try {
    const body = await readBody(event)
    
    // 移除不允许客户端设置的字段
    const { _id, createdAt, updatedAt, ...updateData } = body
    
    // 将数据包装到 data 字段中
    const updated = await updateConfig(id, { data: updateData })
    
    return updated
  } catch (error) {
    console.error('Failed to update config:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to update configuration' 
    })
  }
})
