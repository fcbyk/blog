import { getConfigs } from '~~/server/utils/database'
import { DOCUMENT_IDS } from '~~/shared/types/database'

/**
 * GET /api/config/all
 * 一次性获取所有配置文档（只执行 1 次数据库查询）
 */
export default defineEventHandler(async () => {
  try {
    // ✨ 一次查询获取所有配置
    const configs = await getConfigs([
      DOCUMENT_IDS.BASE_CONFIG,
      DOCUMENT_IDS.KEYWORD_REPLY,
      DOCUMENT_IDS.REGEX_REPLY,
      DOCUMENT_IDS.URL_TRIGGER
    ])

    return {
      baseConfig: configs[DOCUMENT_IDS.BASE_CONFIG]?.data || null,
      keywordReplies: configs[DOCUMENT_IDS.KEYWORD_REPLY]?.data || null,
      regexReplies: configs[DOCUMENT_IDS.REGEX_REPLY]?.data || null,
      urlTriggers: configs[DOCUMENT_IDS.URL_TRIGGER]?.data || null
    }
  } catch (error) {
    console.error('Failed to fetch all configs:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to fetch configurations' 
    })
  }
})
