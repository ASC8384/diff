import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

// 从 package.json 读取版本号，构建时注入前端（页脚展示用）
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// 使用相对路径 base，使产物可部署到任意 GitHub Pages 子路径
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
