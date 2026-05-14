/**
 * 命令解析器
 * 职责：根据预定义的规则匹配用户输入并执行回调
 */
export function useCommandParser() {
  /**
   * 检查并执行单个命令
   * @param content 用户输入的文本
   * @param pattern 匹配的正则表达式
   * @param handler 匹配成功后执行的回调函数
   * @returns 是否触发了命令
   */
  const parseOne = async (
    content: string, 
    pattern: RegExp, 
    handler: (match: RegExpMatchArray) => void | Promise<void>
  ): Promise<boolean> => {
    const match = content.match(pattern)
    
    if (match) {
      try {
        await handler(match)
        return true
      } catch (error) {
        console.error('执行命令回调失败:', error)
        return false
      }
    }
    
    return false
  }

  /**
   * 批量检查并执行命令（按顺序匹配，触发第一个即停止）
   * @param content 用户输入的文本
   * @param rules 命令规则列表
   * @returns 是否触发了某个命令
   */
  const parse = async (
    content: string, 
    rules: Array<{ pattern: RegExp; handler: (match: RegExpMatchArray) => void | Promise<void> }>
  ): Promise<boolean> => {
    for (const rule of rules) {
      const matched = await parseOne(content, rule.pattern, rule.handler)
      if (matched) return true
    }
    return false
  }

  return {
    parse,
    parseOne
  }
}