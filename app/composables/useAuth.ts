const TOKEN_KEY = 'auth-token'

// 创建全局响应式的 token
const token = ref<string | null>(null)

/**
 * 初始化 token（从 localStorage 读取）
 */
export function initToken() {
  if (typeof window !== 'undefined') {
    token.value = localStorage.getItem(TOKEN_KEY)
  }
}

/**
 * 保存 token
 */
export function setToken(newToken: string) {
  token.value = newToken
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, newToken)
  }
}

/**
 * 清除 token
 */
export function clearToken() {
  token.value = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * 获取 token
 */
export function getToken(): string | null {
  return token.value
}

/**
 * 获取 Authorization header
 */
export function getAuthHeader(): { Authorization?: string } {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
