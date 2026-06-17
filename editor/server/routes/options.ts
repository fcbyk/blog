import { readJsonFileSafe, writeJsonFile } from '../utils'
import Router from '@koa/router'
import { Context } from 'koa'
import type {
  MessageConfig,
  ActionMenu,
  KeywordReplyConfig,
  RegexReplyConfig
} from '@types'

// ─── base.json 共享助手 ───

const BASE_FILENAME = 'base.json'

interface BaseConfig {
  helloMsg?: MessageConfig[]
  avatar?: { bot?: string; user?: string }
  menu?: ActionMenu
}

function readFullBase(): BaseConfig {
  const { data } = readJsonFileSafe<BaseConfig>(BASE_FILENAME, {})
  return data
}

function writeFullBase(data: BaseConfig): void {
  writeJsonFile(BASE_FILENAME, data)
}

// ─── 路由工厂 ───

interface ConfigRouteOpts<T = any> {
  filename: string          // JSON 文件名
  apiPath: string            // API 路径 (/api/{apiPath})
  defaultConfig: T
  /** 数据验证函数，返回 null 表示通过 */
  validate?: (data: any) => string | null

  // ---- 以下用于 base.json 字段级操作 ----
  /** 是否为 base 字段（非独立文件） */
  fieldName?: string
  /** 从完整 base 中提取字段 */
  extract?: (base: BaseConfig) => T
  /** 将字段合并回 base */
  merge?: (base: BaseConfig, fieldData: T) => void
}

function createConfigRouter<T = any>(opts: ConfigRouteOpts<T>): Router {
  const {
    filename, apiPath, defaultConfig, validate,
    fieldName, extract, merge
  } = opts

  const router = new Router()
  const fullPath = `/api/${apiPath}`

  // GET
  router.get(fullPath, (ctx: Context) => {
    if (fieldName && extract) {
      // 从 base.json 提取字段
      const base = readFullBase()
      const data = extract(base) ?? defaultConfig
      ctx.status = 200
      ctx.body = { success: true, data, exists: true }
    } else {
      const { data, exists } = readJsonFileSafe<T>(filename, defaultConfig)
      ctx.status = 200
      ctx.body = { success: true, exists, data }
    }
  })

  // POST
  router.post(fullPath, (ctx: Context) => {
    try {
      const newData = ctx.request.body as T

      if (validate) {
        const err = validate(newData)
        if (err) {
          ctx.status = 400
          ctx.body = { success: false, error: err }
          return
        }
      }

      if (fieldName && merge) {
        // 写回 base.json 的对应字段
        const base = readFullBase()
        merge(base, newData)
        writeFullBase(base)
      } else {
        writeJsonFile(filename, newData)
      }

      ctx.status = 200
      ctx.body = { success: true, data: newData }
    } catch (error) {
      ctx.status = 500
      ctx.body = { success: false, error: (error as Error).message }
    }
  })

  return router
}

// ─── 导出所有路由 ───

export default [
  // 1. 站点基础设置 → base.json (helloMsg, avatar, menu)
  createConfigRouter<BaseConfig>({
    filename: BASE_FILENAME,
    apiPath: 'base-config',
    defaultConfig: {} as BaseConfig,
    validate: (data) => {
      if (typeof data !== 'object' || data === null || Array.isArray(data))
        return '无效的数据格式'
      return null
    },
  }),

  // 2. 欢迎消息 → base.json.helloMsg
  createConfigRouter<MessageConfig[]>({
    filename: BASE_FILENAME,
    apiPath: 'hello-config',
    defaultConfig: [],
    fieldName: 'helloMsg',
    extract: (base) => base.helloMsg ?? [],
    merge: (base, data) => { base.helloMsg = data },
    validate: (data) => {
      if (!Array.isArray(data)) return '无效的数据格式，应为数组'
      return null
    },
  }),

  // 3. 菜单设置 → base.json.menu
  createConfigRouter<ActionMenu>({
    filename: BASE_FILENAME,
    apiPath: 'action-menu-config',
    defaultConfig: [],
    fieldName: 'menu',
    extract: (base) => base.menu ?? [],
    merge: (base, data) => { base.menu = data },
    validate: (data) => {
      if (!Array.isArray(data)) return '无效的数据格式，应为数组'
      return null
    },
  }),

  // 4. 关键词回复 → keyword.json
  createConfigRouter<KeywordReplyConfig>({
    filename: 'keyword.json',
    apiPath: 'keyword-reply-config',
    defaultConfig: {},
    validate: (data) => {
      if (typeof data !== 'object' || data === null || Array.isArray(data))
        return '无效的数据格式，应为对象'
      return null
    },
  }),

  // 5. 正则回复 → regex.json
  createConfigRouter<RegexReplyConfig>({
    filename: 'regex.json',
    apiPath: 'regex-reply-config',
    defaultConfig: [],
    validate: (data) => {
      if (!Array.isArray(data)) return '无效的数据格式，应为数组'
      return null
    },
  }),

  // 6. URL 触发 → url.json
  createConfigRouter<{ [key: string]: MessageConfig[] }>({
    filename: 'url.json',
    apiPath: 'url-trigger-config',
    defaultConfig: {},
    validate: (data) => {
      if (typeof data !== 'object' || data === null || Array.isArray(data))
        return '无效的数据格式，应为对象'
      return null
    },
  }),
]
