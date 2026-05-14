import mongoose from 'mongoose'
import type { BaseDocument, DocumentId } from '~~/shared/types/database'

let connection: typeof mongoose | null = null
let ConfigModel: mongoose.Model<any> | null = null

/**
 * 获取 MongoDB 连接（单例模式）
 */
export async function getDb() {
  if (!connection) {
    const config = useRuntimeConfig()
    
    // 从 runtimeConfig 读取配置
    const uri = (config as any).mongodbUri || 'mongodb://localhost:27017'
    
    connection = await mongoose.connect(uri)
    
    console.log('✅ MongoDB connected successfully')
  }
  
  return connection
}

/**
 * 获取集合名称
 */
export function getCollectionName(): string {
  const config = useRuntimeConfig()
  return String((config as any).mongodbCollection || 'configs')
}

/**
 * 获取或创建 Config Model（单例模式，避免重复编译）
 */
function getConfigModel(): mongoose.Model<any> {
  const collectionName = getCollectionName()
  
  // 如果模型已存在，直接返回
  if (ConfigModel) {
    return ConfigModel
  }
  
  // 定义 Schema，_id 使用 String 类型而不是 ObjectId
  const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    createdAt: { type: Date },
    updatedAt: { type: Date }
  }, { 
    strict: false,
    collection: collectionName
  })
  
  // 创建并缓存模型
  try {
    ConfigModel = mongoose.model(collectionName, schema)
  } catch (error: any) {
    // 如果模型已经存在，使用已有的模型
    if (error.name === 'OverwriteModelError') {
      ConfigModel = mongoose.model(collectionName) as mongoose.Model<any>
    } else {
      throw error
    }
  }
  
  return ConfigModel
}

/**
 * 获取配置文档
 */
export async function getConfig<T extends BaseDocument>(id: DocumentId): Promise<T | null> {
  await getDb()
  const Model = getConfigModel()
  const doc = await Model.findById(id).lean()
  
  return doc as T | null
}

/**
 * ✨ 批量获取多个配置文档（一次数据库查询）
 */
export async function getConfigs(ids: DocumentId[]): Promise<Record<DocumentId, any>> {
  await getDb()
  const Model = getConfigModel()
  
  // 使用 $in 操作符一次性查询多个文档
  const docs = await Model.find({
    _id: { $in: ids }
  }).lean()
  
  // 将结果转换为以 _id 为键的对象
  const result: Record<DocumentId, any> = {} as any
  docs.forEach(doc => {
    result[doc._id as DocumentId] = doc
  })
  
  return result
}

/**
 * 更新或创建配置文档（全量更新）
 */
export async function updateConfig<T extends BaseDocument>(
  id: DocumentId,
  data: Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>
): Promise<T | null> {
  await getDb()
  const Model = getConfigModel()
  
  const now = new Date()
  
  // 使用 findOneAndUpdate 实现 upsert（存在则更新，不存在则创建）
  const result = await Model.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...data,
        updatedAt: now
      },
      $setOnInsert: {
        _id: id,
        createdAt: now
      }
    },
    {
      returnDocument: 'after', // 返回更新后的文档（Mongoose 9+）
      upsert: true, // 如果不存在则创建
      lean: true // 返回纯 JavaScript 对象
    }
  )
  
  return result as T | null
}
