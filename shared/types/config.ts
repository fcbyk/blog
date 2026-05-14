import type { MessageConfig, MessageConfigWithRole } from "./message"

// 欢迎消息配置
export type HelloMsg = MessageConfig[]

// 关键词回复配置
export interface KeywordReplyConfig {
  [keyword: string]: MessageConfig[]
}

// 正则表达式回复配置数组
export type RegexReplyConfig = RegexReplyItem[]

// URL参数映射到要发送的消息列表
export interface UrlTriggerConfig {
  [urlPattern: string]: MessageConfigWithRole[]
}

// 正则表达式回复配置项
export interface RegexReplyItem {
  /**
   * 正则表达式模式字符串
   * 注意：在 JSON 中反斜杠需要双重转义
   */
  pattern: string

  // 匹配成功后发送的消息列表
  messages: MessageConfig[]
}

// 头像设置
export interface AvatarConfig {
  bot?: string
  user?: string // 提问者的头像
}
