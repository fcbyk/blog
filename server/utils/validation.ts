import { DOCUMENT_IDS, type DocumentId } from '~~/shared/types/database'

/**
 * 验证配置文档 ID 是否合法
 * @param id - 要验证的 ID
 * @throws 如果 ID 不合法，抛出 400 错误
 */
export function validateConfigId(id: string): asserts id is DocumentId {
  const validIds = Object.values(DOCUMENT_IDS)
  if (!validIds.includes(id as DocumentId)) {
    throw createError({ 
      statusCode: 400, 
      message: `Invalid config ID: ${id}. Valid IDs are: ${validIds.join(', ')}` 
    })
  }
}
