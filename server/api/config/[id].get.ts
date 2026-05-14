import { getConfig } from '~~/server/utils/database'
import { validateConfigId } from '~~/server/utils/validation'

/**
 * GET /api/config/:id
 * 获取指定配置文档
 */
export default defineEventHandler(async (event) => {
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
    const config = await getConfig(id)
    
    if (!config) {
      // 如果配置不存在，返回 null（前端可以处理默认值）
      return null
    }
    
    // 返回 data 字段
    return config.data
  } catch (error) {
    console.error('Failed to fetch config:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to fetch configuration' 
    })
  }
})
