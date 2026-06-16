/**
 * 统一的 API 请求封装
 * 所有请求默认 10 秒超时，超时直接抛出错误由调用方处理
 */

const DEFAULT_TIMEOUT = 10_000

interface ApiOptions {
  /** 覆盖默认超时时间（毫秒） */
  timeout?: number
}

/**
 * 创建一个带超时的 $fetch wrapper
 * 用法和 $fetch 完全一致，只是默认加了 10s 超时
 */
function createApi() {
  return async <T = any>(
    request: Parameters<typeof $fetch>[0],
    options?: Parameters<typeof $fetch>[1] & ApiOptions
  ): Promise<T> => {
    const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options ?? {}

    try {
      return await $fetch<T>(request, {
        ...fetchOptions,
        timeout,
      })
    } catch (err: any) {
      // 检测是否为超时错误
      if (isTimeoutError(err)) {
        throw new ApiTimeoutError()
      }
      throw err
    }
  }
}

/**
 * 判断是否为超时错误
 * ofetch 超时时会抛出 FetchError，其 cause 为 AbortError
 */
function isTimeoutError(err: any): boolean {
  if (err?.name === 'FetchError') {
    const cause = err?.cause
    if (cause?.name === 'AbortError') {
      return true
    }
    // 部分环境下 cause 可能不是 AbortError，用 message 兜底
    if (cause?.message?.includes('abort') || cause?.message?.includes('timeout')) {
      return true
    }
    if (err?.message?.includes('timeout') || err?.message?.includes('aborted')) {
      return true
    }
  }
  return false
}

/** 超时专用错误类 */
export class ApiTimeoutError extends Error {
  constructor() {
    super('请求超时，请检查网络后重试')
    this.name = 'ApiTimeoutError'
  }
}

/** 创建公共 api 实例 */
export const api = createApi()
