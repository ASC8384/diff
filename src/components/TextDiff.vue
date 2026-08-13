<script setup>
import { ref, computed, shallowRef, watch, onMounted } from 'vue'
import DiffInput from './DiffInput.vue'
import DiffViewer from './DiffViewer.vue'
import MergePanel from './MergePanel.vue'
import { computeDiff } from '../utils/diff.js'
import { buildPatch, parsePatchLines } from '../utils/patch.js'
import { buildMerged, defaultChoices, countChoices } from '../utils/merge.js'
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
const live = ref(false) // 实时对比：输入/选项变化自动重算
const picking = ref(false) // 挑选合并：逐处选边并在下方生成结果
const maxSizeMB = ref(5) // 文件载入大小上限（MB），两侧共享

const result = shallowRef(null)
const compared = ref(false)

// 每处差异的选择：{ [hunkId]: 'left' | 'right' | 'both' | 'none' }
const choices = ref({})

// 补丁文本（对比后按需生成，供补丁视图与导出复用）
const patchText = ref('')
const patchLines = shallowRef([])
const copied = ref(false)
const mergeCopied = ref(false)
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
  // 新一轮对比：hunk 编号已变，选择重置为默认（全部用右侧）
  choices.value = defaultChoices(result.value.hunks)
  compared.value = true
}

function swap() {
  ;[leftText.value, rightText.value] = [rightText.value, leftText.value]
  ;[leftName.value, rightName.value] = [rightName.value, leftName.value]
  if (compared.value) compare()
}

/* ---------- 实时对比 ---------- */
// 防抖调度，避免边输入边跑 diff 造成卡顿（大文本已在 computeDiff 内降级）
let liveTimer = null
function scheduleLive() {
  clearTimeout(liveTimer)
  liveTimer = setTimeout(() => {
    if (canCompare.value) compare()
    else {
      // 两侧都清空了：退出结果态
      compared.value = false
      result.value = null
      choices.value = {}
    }
  }, 300)
}

// 开启实时对比、或已在实时模式下改动输入/选项时，自动重算
watch([leftText, rightText, ignoreCase, ignoreWhitespace], () => {
  if (live.value) scheduleLive()
})
watch(live, (on) => {
  if (on && canCompare.value) compare()
})

/* ---------- 挑选合并 ---------- */
function choose(hunkId, kind) {
  choices.value = { ...choices.value, [hunkId]: kind }
}

// 批量：全部用左侧 / 全部用右侧
function chooseAll(kind) {
  const next = {}
  for (const h of result.value?.hunks ?? []) next[h.id] = kind
  choices.value = next
}

function resetChoices() {
  choices.value = defaultChoices(result.value?.hunks)
}

const merged = computed(() => {
  if (!result.value) return { text: '', lines: [] }
  return buildMerged(result.value.rows, result.value.hunks, choices.value, {
    // 末尾换行跟随右侧文本，与 equal 行取右侧原文的基线一致
    trailingNewline: rightText.value.endsWith('\n'),
  })
})

const mergeCounts = computed(() =>
  countChoices(result.value?.hunks, choices.value)
)

async function copyMerged() {
  try {
    await navigator.clipboard.writeText(merged.value.text)
    mergeCopied.value = true
    setTimeout(() => (mergeCopied.value = false), 1600)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

function downloadMerged() {
  const blob = new Blob([merged.value.text], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'merged.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// 把合并结果写回右侧输入框，便于基于结果继续下一轮对比（迭代消化差异）
function applyMerged() {
  rightText.value = merged.value.text
  compare()
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
      // 选取条等交互元素不进导出图。注意无值属性的 dataset 取到空串（falsy），
      // 故按「属性是否存在」判断而非取值。
      filter: (n) => !(n.dataset && 'exportIgnore' in n.dataset),
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
watch(
  [mode, ignoreCase, ignoreWhitespace, highlight, live, picking, maxSizeMB],
  () => {
    save(OPTS_KEY, {
      mode: mode.value,
      ignoreCase: ignoreCase.value,
      ignoreWhitespace: ignoreWhitespace.value,
      highlight: highlight.value,
      live: live.value,
      picking: picking.value,
      maxSizeMB: maxSizeMB.value,
    })
  }
)

onMounted(() => {
  const opts = load(OPTS_KEY, null)
  if (opts) {
    if (['split', 'inline', 'patch'].includes(opts.mode)) mode.value = opts.mode
    ignoreCase.value = !!opts.ignoreCase
    ignoreWhitespace.value = !!opts.ignoreWhitespace
    highlight.value = opts.highlight !== false
    live.value = !!opts.live
    picking.value = !!opts.picking
    if (Number.isFinite(opts.maxSizeMB) && opts.maxSizeMB > 0)
      maxSizeMB.value = opts.maxSizeMB
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
        :max-size-m-b="maxSizeMB"
        @update:max-size-m-b="maxSizeMB = $event"
        @file-name="leftName = $event"
      />
      <DiffInput
        v-model="rightText"
        label="修改后内容"
        :max-size-m-b="maxSizeMB"
        @update:max-size-m-b="maxSizeMB = $event"
        @file-name="rightName = $event"
      />
    </div>

    <div class="toolbar">
      <div class="toolbar__group">
        <button
          class="btn btn--primary"
          :disabled="!canCompare || live"
          :title="live ? '实时对比已开启，无需手动点击' : ''"
          @click="compare"
        >
          对比差异
        </button>
        <button class="btn" @click="swap">交换两侧</button>
        <button
          class="btn"
          :class="{ 'btn--toggle-on': live }"
          :aria-pressed="live"
          @click="live = !live"
        >
          实时对比{{ live ? '：开' : '：关' }}
        </button>
        <button
          class="btn"
          :class="{ 'btn--toggle-on': picking }"
          :aria-pressed="picking"
          title="逐处选择采用左侧还是右侧，在下方生成合并结果"
          @click="picking = !picking"
        >
          挑选合并{{ picking ? '：开' : '：关' }}
        </button>
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
      :hunks="result.hunks"
      :choices="choices"
      :picking="picking"
      :mode="mode"
      :highlight="highlight"
      @choose="choose"
      @bulk="chooseAll"
    />

    <MergePanel
      v-if="picking && compared && stats && !stats.identical"
      :lines="merged.lines"
      :text="merged.text"
      :counts="mergeCounts"
      :copied="mergeCopied"
      @copy="copyMerged"
      @download="downloadMerged"
      @apply="applyMerged"
      @reset="resetChoices"
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
.btn--toggle-on {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary);
}
.btn--toggle-on:hover:not(:disabled) {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary);
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
