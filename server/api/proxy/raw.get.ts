async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastErr: unknown

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'blog-proxy/1.0' },
      })
      clearTimeout(timeoutId)
      return res
    } catch (err: any) {
      clearTimeout(timeoutId)
      lastErr = err
      if (i < retries) {
        // 指数退避: 1s, 2s
        await new Promise(r => setTimeout(r, (i + 1) * 1000))
      }
    }
  }

  throw lastErr
}

export default defineEventHandler(async (event) => {
  const relativePath = getQuery(event).url as string

  if (!relativePath) {
    throw createError({ statusCode: 400, message: 'Missing ?url param' })
  }

  const base = useRuntimeConfig().githubRawBase as string

  // 如果 relativePath 已经是完整 URL（以 http:// 或 https:// 开头），直接使用；
  // 否则拼接到 githubRawBase 后面（兼容首页相对路径加载）
  const fullUrl = /^https?:\/\//i.test(relativePath)
    ? relativePath
    : `${base}${relativePath}`

  let res: Response
  try {
    res = await fetchWithRetry(fullUrl)
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw createError({ statusCode: 504, message: '上游请求超时（多次重试后仍失败）' })
    }
    throw createError({ statusCode: 502, message: `上游请求失败: ${err.message}` })
  }

  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      message: `Upstream error: ${res.statusText}`,
    })
  }

  const text = await res.text()
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return text
})
