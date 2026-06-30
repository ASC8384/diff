<script setup>
import { ref } from 'vue'
import TextDiff from './components/TextDiff.vue'
import ImageDiff from './components/ImageDiff.vue'

const tabs = [
  { key: 'text', label: '文本 / 代码' },
  { key: 'image', label: '图片' },
]
const active = ref('text')
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="brand">
        <span class="brand__mark">±</span>
        <h1 class="brand__title">差异对比工具</h1>
      </div>
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tabs__btn"
          :class="{ 'tabs__btn--active': active === tab.key }"
          @click="active = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
      <p class="app-header__hint">数据全部在本地浏览器中处理，不会上传服务器</p>
    </div>
  </header>

  <main class="app-main">
    <TextDiff v-show="active === 'text'" />
    <ImageDiff v-if="active === 'image'" />
  </main>

  <footer class="app-footer">
    <span>开源的纯前端差异对比工具 · 文本、代码、文件与图片对比</span>
  </footer>
</template>

<style scoped>
.app-header {
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-header__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand__mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.brand__title {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tabs__btn {
  border: 1px solid transparent;
  background: transparent;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-muted);
}
.tabs__btn:hover {
  background: var(--bg);
}
.tabs__btn--active {
  background: #eaf1ff;
  color: var(--primary);
  font-weight: 600;
}
.app-header__hint {
  margin: 0 0 0 auto;
  font-size: 12px;
  color: var(--text-muted);
}
.app-main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
}
.app-footer {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
@media (max-width: 640px) {
  .app-header__hint {
    width: 100%;
    margin: 0;
  }
}
</style>
