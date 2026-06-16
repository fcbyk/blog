export default defineEventHandler(async (event) => {
  const url = getQuery(event).url as string

  if (!url) {
    throw createError({ statusCode: 400, message: 'Missing ?url param' })
  }

  const res = await fetch(url)

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
