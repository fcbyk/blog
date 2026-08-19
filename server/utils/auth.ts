import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NUXT_JWT_SECRET || 'admin-secret-change-in-production'
const JWT_EXPIRES_IN = '30d'

export function generateToken(): string {
  return jwt.sign(
    { authenticated: true, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}