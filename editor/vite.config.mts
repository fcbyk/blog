import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

const editorRoot = path.resolve(__dirname, 'src')
const sharedDir = path.resolve(__dirname, '..', 'shared')

export default defineConfig({
  root: editorRoot,
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'pinia'],
      dts: 'auto-imports.d.ts',
      dirs: ['composables', 'stores']
    }),
    Components({
      dts: 'components.d.ts',
      dirs: ['components'],
      directoryAsNamespace: false
    })
  ],
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, '..', 'editor-dist')
  },
  resolve: {
    alias: {
      '@': editorRoot,
      '@shared': path.resolve(sharedDir),
      '@shared/types': path.resolve(sharedDir, 'types'),
      '@types': path.resolve(sharedDir, 'types')
    }
  },
  optimizeDeps: {
    include: ['vue', 'pinia', 'axios']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true
      }
    }
  }
})
