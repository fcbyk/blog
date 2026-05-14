export type MessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "html"
  | "music"
  | "file"
  | "nav"
export type MessageRole = "bot" | "user"
export type MessageStatus = "loading" | "completed" | "error"
export type MessageContent = string | FileContent | NavContent

// 消息配置
export interface MessageConfig {
  type: MessageType
  content: MessageContent
  loadingTime?: number // 加载时间，单位毫秒
}

// 带角色的基础消息配置
export interface MessageConfigWithRole extends MessageConfig {
  role: MessageRole
}

// 完整消息结构
export interface Message extends MessageConfig {
  id: string // 稳定唯一ID，用于渲染key和状态更新
  time: number // 毫秒级时间戳 = 唯一ID + 时间
  role: MessageRole
  status: MessageStatus
}

// 消息列表
export type MessageList = Message[]

export interface FileContent {
  fileName: string
  fileSize: string
  fileType: string
  fileUrl: string
}

export interface NavContent {
  title: string
  link: string
  desc?: string
  icon?: string
}

/**
 * 消息发送器接口(store实现)
 */
export interface MessageSender {
  /**
   * 发送消息（通用方法）
   * @param message 消息配置（带角色）
   */
  send(message: MessageConfigWithRole): Promise<void>

  /**
   * 以用户身份发送消息
   * @param message 消息配置
   */
  sendAsUser(message: MessageConfig): Promise<void>

  /**
   * 以机器人身份发送消息
   * @param message 消息配置
   */
  sendAsBot(message: MessageConfig): Promise<void>

  /**
   * 批量发送消息（按顺序）
   * @param messages 消息配置列表（带角色）
   */
  sendBatch(messages: MessageConfigWithRole[]): Promise<void>

  /**
   * 以特定角色批量发送消息
   * @param messages 消息配置列表
   * @param role 角色，默认为 'bot'
   */
  sendBatchAs(messages: MessageConfig[], role?: MessageRole): Promise<void>
}
