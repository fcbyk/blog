/**
 * 将 Koa 服务端代码打包为单文件 → editor-dist/server.js
 * 数据分支只需要 node editor-dist/server.js 即可启动
 */
import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const outDir = path.resolve(root, '..', 'editor-dist')

await esbuild.build({
  entryPoints: [path.join(root, 'server/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: path.join(outDir, 'server.js'),
  external: [], // 全部打包进去，不依赖 node_modules
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
  }
})

console.log('✅ editor-dist/server.js built')
