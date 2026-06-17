import fs from 'fs'
import path from 'path'

/**
 * 获取 chat 数据目录路径
 * 基于启动目录（process.cwd()），即在哪个目录执行 node 命令，就从哪读取 chat/
 */
export function getDataDir(): string {
  const dataDir = path.join(process.cwd(), 'chat')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

/** 获取指定文件的完整路径 */
export function getConfigFilePath(filename: string): string {
  return path.join(getDataDir(), filename)
}

/** 安全读取 JSON 配置文件 */
export function readJsonFileSafe<T = any>(filename: string, defaultConfig: T): { data: T; exists: boolean } {
  const filePath = getConfigFilePath(filename)
  const exists = fs.existsSync(filePath)
  const fallbackData = Array.isArray(defaultConfig)
    ? ([...defaultConfig] as T)
    : ({ ...defaultConfig } as T)

  if (!exists) {
    return { data: fallbackData, exists: false }
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return { data: JSON.parse(raw), exists: true }
  } catch (error) {
    console.error(`Error reading ${filename}:`, (error as Error).message)
    return { data: fallbackData, exists: true }
  }
}

/** 深度清理 undefined 值和空字符串 */
function cleanUndefinedValues(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => cleanUndefinedValues(item))
  }
  if (data !== null && typeof data === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'loadingTime' && value === undefined) continue
      if (value === '') continue
      cleaned[key] = cleanUndefinedValues(value)
    }
    return cleaned
  }
  return data
}

/** 写入 JSON 配置文件 */
export function writeJsonFile(filename: string, data: any): void {
  const filePath = getConfigFilePath(filename)
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const cleanedData = cleanUndefinedValues(data)
  fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf-8')
}
