import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NUXT_JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '24h' // token 有效期 24 小时

/**
 * 生成 JWT token
 */
export function generateToken(): string {
  return jwt.sign(
    { 
      authenticated: true,
      timestamp: Date.now() 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * 验证 JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}
