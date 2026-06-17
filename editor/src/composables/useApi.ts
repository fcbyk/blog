const DEFAULT_TIMEOUT = 10_000

interface ApiOptions {
  timeout?: number
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('请求超时，请检查网络后重试')
    this.name = 'ApiTimeoutError'
  }
}

async function request<T = any>(
  url: string,
  options?: RequestInit & ApiOptions
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options ?? {}

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (err: any) {
    clearTimeout(timeoutId)

    if (err.name === 'AbortError') {
      throw new ApiTimeoutError()
    }
    throw err
  }
}

export const api = {
  get: <T = any>(url: string, options?: ApiOptions) =>
    request<T>(url, { method: 'GET', ...options }),

  put: <T = any>(url: string, body: any, options?: ApiOptions) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...options }),

  post: <T = any>(url: string, body: any, options?: ApiOptions) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...options }),

  delete: <T = any>(url: string, options?: ApiOptions) =>
    request<T>(url, { method: 'DELETE', ...options })
}
