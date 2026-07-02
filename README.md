# 差异对比工具

一个纯前端的在线差异对比工具，所有数据均在浏览器本地处理，不会上传服务器。可直接部署到 GitHub Pages。

## 功能

- **文本 / 代码对比**：双栏输入，支持粘贴或上传文件
  - 并排视图 / 行内视图切换
  - 行级增删 + 行内字符级精确高亮
  - 语法高亮、忽略大小写、忽略空白
  - 新增 / 删除行数统计
- **文件上传对比**：拖拽或选择文本文件（`.txt` / `.json` / `.csv` / 各类源码等）
- **图片对比**：并排、滑块拖动、逐像素差异高亮三种模式

## 本地开发

```bash
npm install
npm run dev      # 启动开发服务器 http://localhost:5173
npm run build    # 构建产物到 dist/
npm run preview  # 本地预览构建产物
```

## 部署到 GitHub Pages

1. 将代码推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment** 中，将 **Source** 设置为 **GitHub Actions**。
3. 之后每次推送到 `main`，`.github/workflows/deploy.yml` 会自动构建并发布。

`vite.config.js` 使用相对路径 `base: './'`，因此无论部署在用户主页还是项目子路径下都能正常加载资源。

## 技术栈

Vite + Vue 3 · [jsdiff](https://github.com/kpdecker/jsdiff) 差异算法 · highlight.js 语法高亮。

## 更新日志

版本变更记录见 [CHANGELOG.md](./CHANGELOG.md)，页脚也可点击版本号跳转查看。
