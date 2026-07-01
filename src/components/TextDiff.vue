<script setup>
import { ref, computed, shallowRef, watch, onMounted } from 'vue'
import DiffInput from './DiffInput.vue'
import DiffViewer from './DiffViewer.vue'
import { computeDiff } from '../utils/diff.js'
import { buildPatch, parsePatchLines } from '../utils/patch.js'
import { load, save } from '../utils/storage.js'
import 'highlight.js/styles/github.css'

const leftText = ref('')
const rightText = ref('')
const leftName = ref('')
const rightName = ref('')

const mode = ref('split') // 'split' | 'inline' | 'patch'
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)
const highlight = ref(true)

const result = shallowRef(null)
const compared = ref(false)

// 补丁文本（对比后按需生成，供补丁视图与导出复用）
const patchText = ref('')
const patchLines = shallowRef([])
const copied = ref(false)
const exporting = ref(false)
const viewerRef = ref(null)

function compare() {
  result.value = computeDiff(leftText.value, rightText.value, {
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
  })
  patchText.value = buildPatch(leftText.value, rightText.value, {
    oldName: leftName.value || 'original',
    newName: rightName.value || 'modified',
  })
  patchLines.value = parsePatchLines(patchText.value)
  compared.value = true
}

function swap() {
  ;[leftText.value, rightText.value] = [rightText.value, leftText.value]
  ;[leftName.value, rightName.value] = [rightName.value, leftName.value]
  if (compared.value) compare()
}

/* ---------- 导出 ---------- */
function downloadPatch() {
  if (!patchText.value) return
  const blob = new Blob([patchText.value], { type: 'text/x-patch' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'changes.patch'
  a.click()
  URL.revokeObjectURL(url)
}

async function copyPatch() {
  if (!patchText.value) return
  try {
    await navigator.clipboard.writeText(patchText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

async function exportImage() {
  const node = viewerRef.value?.$el
  if (!node) return
  exporting.value = true
  try {
    const { toPng } = await import('html-to-image')
    const bg = getComputedStyle(document.body).backgroundColor
    const dataUrl = await toPng(node, {
      backgroundColor: bg,
      pixelRatio: 2,
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'diff.png'
    a.click()
  } catch {
    /* 导出失败静默 */
  } finally {
    exporting.value = false
  }
}

const stats = computed(() => result.value?.stats)
const canCompare = computed(
  () => leftText.value.length > 0 || rightText.value.length > 0
)

/* ---------- 本地持久化 ---------- */
const OPTS_KEY = 'text-opts'
let saveTimer = null

function persistTexts() {
  save('text-left', leftText.value)
  save('text-right', rightText.value)
  save('text-names', { left: leftName.value, right: rightName.value })
}

// 文本防抖写入，避免每次按键都落盘
watch([leftText, rightText, leftName, rightName], () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persistTexts, 300)
})

// 选项/视图即时写入
watch([mode, ignoreCase, ignoreWhitespace, highlight], () => {
  save(OPTS_KEY, {
    mode: mode.value,
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
    highlight: highlight.value,
  })
})

onMounted(() => {
  const opts = load(OPTS_KEY, null)
  if (opts) {
    if (['split', 'inline', 'patch'].includes(opts.mode)) mode.value = opts.mode
    ignoreCase.value = !!opts.ignoreCase
    ignoreWhitespace.value = !!opts.ignoreWhitespace
    highlight.value = opts.highlight !== false
  }
  leftText.value = load('text-left', '') || ''
  rightText.value = load('text-right', '') || ''
  const names = load('text-names', null)
  if (names) {
    leftName.value = names.left || ''
    rightName.value = names.right || ''
  }
  // 恢复到有内容时自动对比一次，省得用户再点
  if (leftText.value || rightText.value) compare()
})
</script>

<template>
  <section>
    <div class="inputs">
      <DiffInput
        v-model="leftText"
        label="原始内容"
        @file-name="leftName = $event"
      />
      <DiffInput
        v-model="rightText"
        label="修改后内容"
        @file-name="rightName = $event"
      />
    </div>

    <div class="toolbar">
      <div class="toolbar__group">
        <button class="btn btn--primary" :disabled="!canCompare" @click="compare">
          对比差异
        </button>
        <button class="btn" @click="swap">交换两侧</button>
      </div>

      <div class="toolbar__group toolbar__opts">
        <label class="opt"
          ><input type="checkbox" v-model="ignoreCase" />忽略大小写</label
        >
        <label class="opt"
          ><input type="checkbox" v-model="ignoreWhitespace" />忽略空白</label
        >
        <label class="opt"
          ><input type="checkbox" v-model="highlight" />语法高亮</label
        >
      </div>

      <div class="view-switch">
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'split' }"
          @click="mode = 'split'"
        >
          并排视图
        </button>
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'inline' }"
          @click="mode = 'inline'"
        >
          行内视图
        </button>
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'patch' }"
          @click="mode = 'patch'"
        >
          补丁
        </button>
      </div>
    </div>

    <div v-if="compared && stats" class="result-bar">
      <div class="stats">
        <template v-if="stats.identical">
          <span class="stats__pill stats__pill--same">两侧内容完全相同</span>
        </template>
        <template v-else>
          <span class="stats__pill stats__pill--added">+{{ stats.added }} 行新增</span>
          <span class="stats__pill stats__pill--removed">−{{ stats.removed }} 行删除</span>
        </template>
        <span v-if="stats.degraded" class="stats__note">
          内容较大，已跳过行内字符级高亮
        </span>
      </div>

      <div v-if="!stats.identical" class="export">
        <button class="btn btn--sm" @click="downloadPatch">下载 .patch</button>
        <button class="btn btn--sm" @click="copyPatch">
          {{ copied ? '已复制' : '复制补丁' }}
        </button>
        <button class="btn btn--sm" :disabled="exporting" @click="exportImage">
          {{ exporting ? '导出中…' : '导出图片' }}
        </button>
      </div>
    </div>

    <DiffViewer
      v-if="compared && stats && !stats.identical"
      ref="viewerRef"
      :rows="result.rows"
      :inline-rows="result.inlineRows"
      :patch-lines="patchLines"
      :mode="mode"
      :highlight="highlight"
    />
  </section>
</template>

<style scoped>
.inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin: 16px 0;
}
/* 操作聚拢：同组按钮紧挨，组间用中等间距区隔 */
.toolbar__group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar__opts {
  gap: 16px;
}
.btn {
  border: 1px solid var(--border-strong);
  background: var(--panel);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  transition: border-color 0.16s, color 0.16s, background 0.16s;
}
.btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: #fff;
}
.btn--sm {
  padding: 6px 12px;
  font-size: 12.5px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}
.opt input {
  accent-color: var(--primary);
  width: 15px;
  height: 15px;
}
.view-switch {
  display: flex;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--panel);
}
.view-switch__btn {
  border: none;
  background: transparent;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: background 0.16s, color 0.16s;
}
.view-switch__btn:hover:not(.view-switch__btn--active) {
  background: var(--panel-soft);
  color: var(--text);
}
.view-switch__btn--active {
  background: var(--primary-soft);
  color: var(--primary);
}
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.stats {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stats__pill {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
}
.stats__pill--added {
  color: var(--added-fg);
  background: var(--added-bg);
}
.stats__pill--removed {
  color: var(--removed-fg);
  background: var(--removed-bg);
}
.stats__pill--same {
  color: var(--added-fg);
  background: var(--added-bg);
}
.stats__note {
  font-size: 12px;
  color: var(--text-muted);
}
.export {
  display: flex;
  gap: 8px;
}
@media (max-width: 720px) {
  .inputs {
    grid-template-columns: 1fr;
  }
}
</style>
