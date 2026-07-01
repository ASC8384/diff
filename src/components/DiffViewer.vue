<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import hljs from 'highlight.js/lib/common'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  inlineRows: { type: Array, default: () => [] },
  patchLines: { type: Array, default: () => [] },
  mode: { type: String, default: 'split' }, // 'split' | 'inline' | 'patch'
  highlight: { type: Boolean, default: true },
  language: { type: String, default: '' }, // '' 表示自动检测
})

const CONTEXT = 3 // 折叠时变更块上下各保留的行数

// 对单个片段文本做语法高亮，返回 HTML 字符串
function renderSegment(seg) {
  const value = seg.value ?? ''
  if (!props.highlight || value === '') {
    return escapeHtml(value)
  }
  try {
    if (props.language && hljs.getLanguage(props.language)) {
      return hljs.highlight(value, { language: props.language }).value
    }
    return hljs.highlightAuto(value).value
  } catch {
    return escapeHtml(value)
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function segClass(seg) {
  if (seg.type === 'added') return 'seg seg--added'
  if (seg.type === 'removed') return 'seg seg--removed'
  return 'seg'
}

function rowClass(type) {
  return {
    'row--added': type === 'added',
    'row--removed': type === 'removed',
    'row--modified': type === 'modified',
  }
}

/* ---------- 折叠未改动的行 ---------- */
const collapsed = ref(true)
// 记录被用户手动展开的折叠块 id
const expanded = ref(new Set())

// 每次输入变化（新一轮对比）重置折叠展开状态与跳转位置
watch(
  () => [props.rows, props.inlineRows],
  () => {
    expanded.value = new Set()
    currentHunk.value = -1
  }
)

// 把行列表按连续 equal 段折叠，产出显示项：
// { kind: 'row', row, index } 或 { kind: 'fold', id, count }
function foldList(list) {
  if (!collapsed.value) {
    return list.map((row, index) => ({ kind: 'row', row, index }))
  }
  const out = []
  let i = 0
  while (i < list.length) {
    if (list[i].type !== 'equal') {
      out.push({ kind: 'row', row: list[i], index: i })
      i++
      continue
    }
    let j = i
    while (j < list.length && list[j].type === 'equal') j++
    const runLen = j - i
    const top = i === 0 ? 0 : CONTEXT // 段首（文件开头）不留上文
    const bottom = j === list.length ? 0 : CONTEXT // 段尾（文件结尾）不留下文
    const id = 'f' + i
    if (runLen > top + bottom + 1 && !expanded.value.has(id)) {
      for (let k = 0; k < top; k++)
        out.push({ kind: 'row', row: list[i + k], index: i + k })
      out.push({ kind: 'fold', id, count: runLen - top - bottom })
      for (let k = runLen - bottom; k < runLen; k++)
        out.push({ kind: 'row', row: list[i + k], index: i + k })
    } else {
      for (let k = 0; k < runLen; k++)
        out.push({ kind: 'row', row: list[i + k], index: i + k })
    }
    i = j
  }
  return out
}

function expandFold(id) {
  const s = new Set(expanded.value)
  s.add(id)
  expanded.value = s
}

const displaySplit = computed(() => foldList(props.rows))
const displayInline = computed(() => foldList(props.inlineRows))
const activeDisplay = computed(() =>
  props.mode === 'inline' ? displayInline.value : displaySplit.value
)

/* ---------- 差异跳转 ---------- */
// 计算每个「变更块」（连续非 equal 行）起始的显示下标
const hunkStarts = computed(() => {
  const starts = []
  let prevChange = false
  activeDisplay.value.forEach((item, idx) => {
    const isChange = item.kind === 'row' && item.row.type !== 'equal'
    if (isChange && !prevChange) starts.push(idx)
    prevChange = isChange
  })
  return starts
})
// 显示下标 → 变更块编号（仅每个块的首行有值），用于渲染锚点 id
const hunkNoAt = computed(() => {
  const map = new Map()
  hunkStarts.value.forEach((displayIdx, no) => map.set(displayIdx, no))
  return map
})

const currentHunk = ref(-1)
const flashId = ref(-1)
const rootEl = ref(null)

function goHunk(n) {
  const count = hunkStarts.value.length
  if (!count) return
  const idx = ((n % count) + count) % count
  currentHunk.value = idx
  nextTick(() => {
    const el = rootEl.value?.querySelector('#diff-hunk-' + idx)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    flashId.value = idx
    setTimeout(() => {
      if (flashId.value === idx) flashId.value = -1
    }, 900)
  })
}

function onKey(e) {
  if (!e.altKey || props.mode === 'patch') return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    goHunk(currentHunk.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    goHunk(currentHunk.value - 1)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const hasContent = computed(
  () =>
    props.rows.length > 0 ||
    props.inlineRows.length > 0 ||
    props.patchLines.length > 0
)
</script>

<template>
  <div class="viewer" v-if="hasContent" ref="rootEl">
    <!-- 结果区工具条：折叠开关 + 差异跳转（补丁视图下隐藏） -->
    <div class="viewer__bar" v-if="mode !== 'patch'">
      <button
        class="viewer__tool"
        :class="{ 'viewer__tool--on': collapsed }"
        type="button"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '已折叠相同行' : '显示全部行' }}
      </button>
      <div class="viewer__nav" v-if="hunkStarts.length">
        <button
          class="viewer__tool"
          type="button"
          title="上一处差异 (Alt+↑)"
          @click="goHunk(currentHunk - 1)"
        >
          ↑
        </button>
        <span class="viewer__count">
          {{ currentHunk < 0 ? 0 : currentHunk + 1 }} / {{ hunkStarts.length }}
        </span>
        <button
          class="viewer__tool"
          type="button"
          title="下一处差异 (Alt+↓)"
          @click="goHunk(currentHunk + 1)"
        >
          ↓
        </button>
      </div>
    </div>

    <!-- 并排视图 -->
    <table v-if="mode === 'split'" class="diff-table">
      <colgroup>
        <col class="col-no" />
        <col class="col-code" />
        <col class="col-no" />
        <col class="col-code" />
      </colgroup>
      <tbody>
        <template v-for="(item, i) in displaySplit" :key="'s' + i">
          <tr v-if="item.kind === 'fold'" class="fold-row">
            <td class="fold-cell" colspan="4" @click="expandFold(item.id)">
              <span class="fold-cell__text">
                ⋯ 展开 {{ item.count }} 行相同内容
              </span>
            </td>
          </tr>
          <tr
            v-else
            :id="hunkNoAt.has(i) ? 'diff-hunk-' + hunkNoAt.get(i) : null"
            :class="{ 'row--flash': hunkNoAt.get(i) === flashId }"
          >
            <td class="gutter">{{ item.row.leftNo ?? '' }}</td>
            <td
              class="code"
              :class="{
                'cell--removed':
                  item.row.type === 'removed' || item.row.type === 'modified',
              }"
            >
              <template v-if="item.row.leftSegments">
                <span
                  v-for="(seg, j) in item.row.leftSegments"
                  :key="j"
                  :class="segClass(seg)"
                  v-html="renderSegment(seg)"
                ></span>
              </template>
            </td>
            <td class="gutter">{{ item.row.rightNo ?? '' }}</td>
            <td
              class="code"
              :class="{
                'cell--added':
                  item.row.type === 'added' || item.row.type === 'modified',
              }"
            >
              <template v-if="item.row.rightSegments">
                <span
                  v-for="(seg, j) in item.row.rightSegments"
                  :key="j"
                  :class="segClass(seg)"
                  v-html="renderSegment(seg)"
                ></span>
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- 行内视图 -->
    <table v-else-if="mode === 'inline'" class="diff-table">
      <colgroup>
        <col class="col-no" />
        <col class="col-no" />
        <col class="col-sign" />
        <col class="col-code" />
      </colgroup>
      <tbody>
        <template v-for="(item, i) in displayInline" :key="'i' + i">
          <tr v-if="item.kind === 'fold'" class="fold-row">
            <td class="fold-cell" colspan="4" @click="expandFold(item.id)">
              <span class="fold-cell__text">
                ⋯ 展开 {{ item.count }} 行相同内容
              </span>
            </td>
          </tr>
          <tr
            v-else
            :id="hunkNoAt.has(i) ? 'diff-hunk-' + hunkNoAt.get(i) : null"
            :class="[
              rowClass(item.row.type),
              { 'row--flash': hunkNoAt.get(i) === flashId },
            ]"
          >
            <td class="gutter">{{ item.row.leftNo ?? '' }}</td>
            <td class="gutter">{{ item.row.rightNo ?? '' }}</td>
            <td class="sign">
              <span v-if="item.row.type === 'added'">+</span>
              <span v-else-if="item.row.type === 'removed'">-</span>
            </td>
            <td
              class="code"
              :class="{
                'cell--added': item.row.type === 'added',
                'cell--removed': item.row.type === 'removed',
              }"
            >
              <span
                v-for="(seg, j) in item.row.segments"
                :key="j"
                :class="segClass(seg)"
                v-html="renderSegment(seg)"
              ></span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- 补丁视图（unified diff） -->
    <div v-else class="patch">
      <div
        v-for="(line, i) in patchLines"
        :key="'p' + i"
        class="patch__line"
        :class="'patch__line--' + line.type"
      >{{ line.value || ' ' }}</div>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: auto;
  box-shadow: var(--shadow-sm);
}
.viewer__bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--panel-soft);
  border-bottom: 1px solid var(--border);
}
.viewer__nav {
  display: flex;
  align-items: center;
  gap: 6px;
}
.viewer__tool {
  border: 1px solid var(--border-strong);
  background: var(--panel);
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: color 0.16s, border-color 0.16s;
}
.viewer__tool:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.viewer__tool--on {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}
.viewer__count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  min-width: 44px;
  text-align: center;
}
.diff-table {
  border-collapse: collapse;
  width: 100%;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
}
.col-no {
  width: 52px;
}
.col-sign {
  width: 26px;
}
.col-code {
  width: auto;
}
.gutter {
  text-align: right;
  padding: 0 10px;
  color: var(--text-muted);
  background: var(--gutter-bg);
  border-right: 1px solid var(--border);
  user-select: none;
  white-space: nowrap;
  vertical-align: top;
  font-size: 12px;
}
.sign {
  text-align: center;
  font-weight: 600;
  user-select: none;
  vertical-align: top;
}
.row--added .sign {
  color: var(--added-fg);
}
.row--removed .sign {
  color: var(--removed-fg);
}
.code {
  padding: 0 12px;
  white-space: pre-wrap;
  word-break: break-word;
  vertical-align: top;
}
.cell--added {
  background: var(--added-bg);
  box-shadow: inset 3px 0 0 var(--added-fg);
}
.cell--removed {
  background: var(--removed-bg);
  box-shadow: inset 3px 0 0 var(--removed-fg);
}
.seg--added {
  background: var(--added-char);
  border-radius: 3px;
  padding: 1px 0;
}
.seg--removed {
  background: var(--removed-char);
  border-radius: 3px;
  padding: 1px 0;
}

/* 折叠占位行 */
.fold-row .fold-cell {
  padding: 5px 12px;
  text-align: center;
  background: var(--gutter-bg);
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  font-family: var(--font-sans);
  font-size: 12.5px;
  transition: color 0.16s, background 0.16s;
}
.fold-row .fold-cell:hover {
  color: var(--primary);
  background: var(--primary-soft);
}

/* 差异跳转时的短暂高亮 */
.row--flash td {
  animation: flash 0.9s ease-out;
}
@keyframes flash {
  0% {
    box-shadow: inset 0 0 0 9999px var(--ring);
  }
  100% {
    box-shadow: none;
  }
}

/* 补丁视图 */
.patch {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  padding: 8px 0;
}
.patch__line {
  padding: 0 14px;
  white-space: pre-wrap;
  word-break: break-word;
}
.patch__line--meta {
  color: var(--text-muted);
}
.patch__line--hunk {
  color: var(--primary);
  background: var(--primary-soft);
}
.patch__line--added {
  color: var(--added-fg);
  background: var(--added-bg);
}
.patch__line--removed {
  color: var(--removed-fg);
  background: var(--removed-bg);
}
</style>
