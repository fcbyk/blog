import type {
  HelloMsg,
  KeywordReplyConfig,
  RegexReplyConfig,
  UrlTriggerConfig,
  AvatarConfig
} from "./config"
import type { ActionMenu } from "./menu"

// MongoDB 文档基础接口
export interface BaseDocument {
  _id?: string
  createdAt?: Date
  updatedAt?: Date
  data: any
}

// 配置文档 ID 常量
export const DOCUMENT_IDS = {
  KEYWORD_REPLY: "keyword_reply_config",
  REGEX_REPLY: "regex_reply_config",
  URL_TRIGGER: "url_trigger_config",
  BASE_CONFIG: "base_config"
} as const

export type DocumentId = (typeof DOCUMENT_IDS)[keyof typeof DOCUMENT_IDS]

// 关键词回复配置文档
export interface KeywordReplyDocument extends BaseDocument {
  _id: typeof DOCUMENT_IDS.KEYWORD_REPLY
  data: KeywordReplyConfig
}

// 正则表达式回复配置文档
export interface RegexReplyDocument extends BaseDocument {
  _id: typeof DOCUMENT_IDS.REGEX_REPLY
  data: RegexReplyConfig
}

// URL触发器配置文档
export interface UrlTriggerDocument extends BaseDocument {
  _id: typeof DOCUMENT_IDS.URL_TRIGGER
  data: UrlTriggerConfig
}

// 基础配置文档（欢迎消息、头像、菜单等）
export interface BaseConfigDocument extends BaseDocument {
  _id: typeof DOCUMENT_IDS.BASE_CONFIG
  data: {
    helloMsg: HelloMsg
    avatar: AvatarConfig
    menu: ActionMenu
  }
}

export type Datas = {
  baseConfig: BaseConfigDocument['data']
  keywordReplies: KeywordReplyDocument['data']
  regexReplies: RegexReplyDocument['data']
  urlTriggers: UrlTriggerDocument['data']
}
