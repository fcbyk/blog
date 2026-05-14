/**
 * 格式化时间（微信风格）
 * @param timestamp 时间戳（number | string | Date）
 * @returns 格式化后的时间字符串
 */
export const formatTime = (timestamp: number | string | Date): string => {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    throw new Error("Invalid timestamp")
  }

  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const formatTime = (): string =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六"
  ]

  // 今天
  if (diffDays === 0) return formatTime()
  // 昨天
  else if (diffDays === 1) return `昨天 ${formatTime()}`
  // 本周内（且不是昨天）
  else if (diffDays < 7 && diffDays > 1)
    return weekdays[date.getDay()] || "未知"
  else if (date.getFullYear() === now.getFullYear())
    return `${date.getMonth() + 1}月${date.getDate()}日`
  else
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 睡眠函数
 * @param ms 毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 根据文本长度动态计算加载时间（带随机波动）
 * @param text 文本内容
 * @param minTime 最小时间（毫秒），默认 500ms
 * @param maxTime 最大时间（毫秒），默认 3000ms
 * @returns 计算后的加载时间
 */
export function calculateLoadingTime(
    text: string,
    minTime: number = 500,
    maxTime: number = 3000
): number {
    // 每个字符约 25ms，模拟打字速度
    const charSpeed = 25
    const baseTime = text.length * charSpeed
    
    // 添加 ±15% 的随机波动，更自然
    const randomFactor = 0.85 + Math.random() * 0.3  // 0.85 ~ 1.15
    const adjustedTime = baseTime * randomFactor
    
    // 限制在合理范围内
    return Math.min(Math.max(adjustedTime, minTime), maxTime)
}
