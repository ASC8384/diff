<script setup>
import { ref } from 'vue'
import TextDiff from './components/TextDiff.vue'
import ImageDiff from './components/ImageDiff.vue'

const tabs = [
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
]
const active = ref('text')
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="brand">
        <span class="brand__mark">diff<i>±</i></span>
        <span class="brand__sub">在线差异对比</span>
      </div>

      <nav class="tabs" :style="{ '--tab-index': active === 'text' ? 0 : 1 }">
        <span class="tabs__thumb"></span>
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

      <span class="privacy">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2 4 5v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V5l-8-3Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        本地处理 · 不上传
      </span>
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
  background: color-mix(in srgb, var(--panel) 82%, transparent);
  backdrop-filter: saturate(160%) blur(12px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-header__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.brand__mark {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}
.brand__mark i {
  font-style: normal;
  color: var(--primary);
  font-size: 0.82em;
  margin-left: 0.04em;
}
.brand__sub {
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* 分段式 Tab，带滑动指示块 */
.tabs {
  position: relative;
  display: flex;
  padding: 4px;
  background: var(--bg-soft);
  border-radius: 12px;
}
.tabs__thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  transform: translateX(calc(var(--tab-index) * 100%));
  background: var(--panel);
  border-radius: 9px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.tabs__btn {
  position: relative;
  z-index: 1;
  flex: 1;
  border: none;
  background: transparent;
  padding: 7px 18px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--text-muted);
  transition: color 0.2s;
}
.tabs__btn--active {
  color: var(--primary);
  font-weight: 600;
}

.privacy {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--added-fg);
  background: var(--added-bg);
  padding: 5px 11px;
  border-radius: 999px;
}
.privacy svg {
  width: 14px;
  height: 14px;
}

.app-main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
}
.app-footer {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: var(--text-muted);
}
@media (max-width: 640px) {
  .brand__sub {
    display: none;
  }
  .privacy {
    width: 100%;
    margin: 0;
    justify-content: center;
  }
}
</style>
