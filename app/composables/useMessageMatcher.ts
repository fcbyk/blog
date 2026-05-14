import type { MessageConfig, MessageConfigWithRole } from '~~/shared/types/message'

/**
 * 触发类型
 */
type TriggerType = 'keyword' | 'regex'

/**
 * 匹配结果
 */
interface MatchResult {
  matched: boolean
  messages: MessageConfig[]
  triggerType?: TriggerType
  triggerKey?: string
}

/**
 * 消息匹配器
 * 职责：根据配置检查消息是否匹配关键词或正则规则
 */
export function useMessageMatcher() {
  const appStore = useAppStore()

  /**
   * 检查单条消息是否匹配规则
   */
  const checkMatch = (messageContent: string): MatchResult => {
    const keywordReplies = appStore.datas?.keywordReplies || {}
    const regexReplies = appStore.datas?.regexReplies || []

    // 优先匹配关键词
    const matchedKeyword = Object.keys(keywordReplies).find(
      key => messageContent === key
    )

    if (matchedKeyword) {
      return {
        matched: true,
        messages: keywordReplies[matchedKeyword] || [],
        triggerType: 'keyword',
        triggerKey: matchedKeyword
      }
    }

    // 尝试正则匹配
    if (regexReplies && Array.isArray(regexReplies)) {
      for (const rule of regexReplies) {
        try {
          const regex = new RegExp(rule.pattern)
          if (regex.test(messageContent)) {
            return {
              matched: true,
              messages: rule.messages || [],
              triggerType: 'regex',
              triggerKey: rule.pattern
            }
          }
        } catch (error) {
          console.warn(`正则表达式 "${rule.pattern}" 无效:`, error)
        }
      }
    }

    return { matched: false, messages: [] }
  }

  /**
   * 批量检查带角色的消息列表，收集所有匹配的回复（去重）
   * @param messages 带角色的消息列表
   * @returns 匹配结果（包含所有要回复的消息，相同规则只触发一次）
   */
  const collectAllReplies = (messages: MessageConfigWithRole[]): MatchResult => {
    const allReplyMessages: MessageConfig[] = []
    const triggeredRules = new Set<string>() // 记录已触发的规则标识

    // 筛选出 user 消息用于匹配
    const userMessages = messages.filter(msg => msg.role === 'user')

    for (const message of userMessages) {
      // 只检查文本消息
      if (message.type === 'text' && typeof message.content === 'string') {
        const result = checkMatch(message.content)
        
        if (result.matched) {
          // 生成规则的唯一标识：类型 + 关键字/模式
          const ruleKey = `${result.triggerType}:${result.triggerKey}`
          
          // 如果该规则尚未触发过，则添加回复
          if (!triggeredRules.has(ruleKey)) {
            triggeredRules.add(ruleKey)
            allReplyMessages.push(...result.messages)
          }
        }
      }
    }

    return {
      matched: allReplyMessages.length > 0,
      messages: allReplyMessages
    }
  }

  return {
    checkMatch,
    collectAllReplies
  }
}