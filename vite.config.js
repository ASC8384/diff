import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 使用相对路径 base，使产物可部署到任意 GitHub Pages 子路径
export default defineConfig({
  base: './',
  plugins: [vue()],
})
