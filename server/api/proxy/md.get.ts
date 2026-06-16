export default defineEventHandler(async (event) => {
  const url = getQuery(event).url as string

  if (!url) {
    throw createError({ statusCode: 400, message: 'Missing ?url param' })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      throw createError({ statusCode: 504, message: '上游请求超时' })
    }
    throw createError({ statusCode: 502, message: `上游请求失败: ${err.message}` })
  }

  clearTimeout(timeoutId)

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
