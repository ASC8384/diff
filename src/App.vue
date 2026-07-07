<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import TextDiff from './components/TextDiff.vue'
import ImageDiff from './components/ImageDiff.vue'
import { load, save } from './utils/storage.js'

const tabs = [
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
]
const active = ref('text')

// 宽屏平铺：去掉主区限宽，铺满视口宽度。偏好持久化。
const wide = ref(false)
function toggleWide() {
  wide.value = !wide.value
  save('wide', wide.value)
}

// 版本号由 vite.config.js 从 package.json 注入；页脚链到更新日志
const version = __APP_VERSION__
const changelogUrl =
  'https://github.com/ASC8384/diff/blob/main/CHANGELOG.md'

/* 主题三态：auto（跟随系统）→ light → dark → auto 循环。
   偏好存 localStorage，生效值写到 <html data-theme>（与 index.html 防闪烁脚本一致）。 */
const themePref = ref('auto')
const themeMeta = {
  auto: { label: '跟随系统', next: 'light' },
  light: { label: '浅色', next: 'dark' },
  dark: { label: '深色', next: 'auto' },
}
let media = null

function applyTheme() {
  const effective =
    themePref.value === 'auto'
      ? media && media.matches
        ? 'dark'
        : 'light'
      : themePref.value
  document.documentElement.setAttribute('data-theme', effective)
}

function cycleTheme() {
  themePref.value = themeMeta[themePref.value].next
  save('theme', themePref.value)
  applyTheme()
}

function onSystemChange() {
  if (themePref.value === 'auto') applyTheme()
}

onMounted(() => {
  const saved = load('theme', 'auto')
  themePref.value = ['auto', 'light', 'dark'].includes(saved) ? saved : 'auto'
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onSystemChange)
  applyTheme()
  wide.value = !!load('wide', false)
})

onBeforeUnmount(() => {
  if (media) media.removeEventListener('change', onSystemChange)
})
</script>

<template>
  <header class="app-header" :class="{ 'app-header--wide': wide }">
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

      <button
        class="theme-btn"
        type="button"
        :class="{ 'theme-btn--on': wide }"
        :title="wide ? '宽屏平铺：开（点击关闭）' : '宽屏平铺：关（点击铺满）'"
        :aria-label="'宽屏平铺' + (wide ? '已开启' : '已关闭')"
        :aria-pressed="wide"
        @click="toggleWide"
      >
        <!-- 平铺：左右扩展箭头 -->
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5v14M21 5v14M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        class="theme-btn"
        type="button"
        :title="'主题：' + themeMeta[themePref].label + '（点击切换）'"
        :aria-label="'主题：' + themeMeta[themePref].label"
        @click="cycleTheme"
      >
        <!-- auto：显示器 -->
        <svg v-if="themePref === 'auto'" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M8 20h8M12 16v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <!-- light：太阳 -->
        <svg v-else-if="themePref === 'light'" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 2.5v2.6M12 18.9v2.6M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.2 19.8 6 18M18 6l1.8-1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <!-- dark：月亮 -->
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </header>

  <main class="app-main" :class="{ 'app-main--wide': wide }">
    <TextDiff v-show="active === 'text'" />
    <ImageDiff v-if="active === 'image'" />
  </main>

  <footer class="app-footer">
    <span>开源的纯前端差异对比工具 · 文本、代码、文件与图片对比</span>
    <a
      class="app-footer__version"
      :href="changelogUrl"
      target="_blank"
      rel="noopener noreferrer"
      title="查看更新日志"
    >
      v{{ version }}
    </a>
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

.theme-btn {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-strong);
  background: var(--panel);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: color 0.16s, border-color 0.16s, background 0.16s;
}
.theme-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.theme-btn--on {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}
.theme-btn svg {
  width: 17px;
  height: 17px;
}

.app-main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
}
/* 宽屏平铺：主区与顶栏内容都放开限宽，铺满视口 */
.app-main--wide {
  max-width: none;
}
.app-header--wide .app-header__inner {
  max-width: none;
}
.app-footer {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.app-footer__version {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  transition: color 0.16s, border-color 0.16s;
}
.app-footer__version:hover {
  color: var(--primary);
  border-color: var(--primary);
}
@media (max-width: 640px) {
  .brand__sub {
    display: none;
  }
  .privacy {
    margin-left: auto;
  }
}
</style>
