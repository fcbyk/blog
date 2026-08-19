import { verifyToken } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false }
  }

  const token = authHeader.substring(7)
  const valid = verifyToken(token)

  return { valid }
})