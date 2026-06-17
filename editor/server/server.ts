import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import serve from 'koa-static'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import optionsRouter from './routes/options'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = 3456
const cwd = process.cwd()

const app = new Koa()

// CORS
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }
  await next()
})

app.use(bodyParser())

// 配置 CRUD 路由
optionsRouter.forEach(router => {
  app.use(router.routes()).use(router.allowedMethods())
})

// 静态文件 + SPA fallback：server.js 所在目录（即 editor-dist/）
const distPath = __dirname
if (fs.existsSync(distPath)) {
  app.use(async (ctx, next) => {
    await serve(distPath)(ctx, async () => {
      ctx.type = 'html'
      ctx.body = fs.readFileSync(path.join(distPath, 'index.html'))
    })
  })
}

app.listen(PORT, () => {
  console.log(`\n  🛠️  本地编辑器已启动`)
  console.log(`  📁 数据目录: ${path.join(cwd, 'chat')}`)
  console.log(`  🌐 地址:     http://localhost:${PORT}\n`)
})

export default app
