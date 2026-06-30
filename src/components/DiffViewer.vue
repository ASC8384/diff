<script setup>
import { computed } from 'vue'
import hljs from 'highlight.js/lib/common'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  inlineRows: { type: Array, default: () => [] },
  mode: { type: String, default: 'split' }, // 'split' | 'inline'
  highlight: { type: Boolean, default: true },
  language: { type: String, default: '' }, // '' 表示自动检测
})

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

const hasContent = computed(
  () => props.rows.length > 0 || props.inlineRows.length > 0
)
</script>

<template>
  <div class="viewer" v-if="hasContent">
    <!-- 并排视图 -->
    <table v-if="mode === 'split'" class="diff-table">
      <colgroup>
        <col class="col-no" />
        <col class="col-code" />
        <col class="col-no" />
        <col class="col-code" />
      </colgroup>
      <tbody>
        <tr v-for="(row, i) in rows" :key="'s' + i">
          <td class="gutter">{{ row.leftNo ?? '' }}</td>
          <td
            class="code"
            :class="{
              'cell--removed': row.type === 'removed' || row.type === 'modified',
            }"
          >
            <template v-if="row.leftSegments">
              <span
                v-for="(seg, j) in row.leftSegments"
                :key="j"
                :class="segClass(seg)"
                v-html="renderSegment(seg)"
              ></span>
            </template>
          </td>
          <td class="gutter">{{ row.rightNo ?? '' }}</td>
          <td
            class="code"
            :class="{
              'cell--added': row.type === 'added' || row.type === 'modified',
            }"
          >
            <template v-if="row.rightSegments">
              <span
                v-for="(seg, j) in row.rightSegments"
                :key="j"
                :class="segClass(seg)"
                v-html="renderSegment(seg)"
              ></span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 行内视图 -->
    <table v-else class="diff-table">
      <colgroup>
        <col class="col-no" />
        <col class="col-no" />
        <col class="col-sign" />
        <col class="col-code" />
      </colgroup>
      <tbody>
        <tr v-for="(row, i) in inlineRows" :key="'i' + i" :class="rowClass(row.type)">
          <td class="gutter">{{ row.leftNo ?? '' }}</td>
          <td class="gutter">{{ row.rightNo ?? '' }}</td>
          <td class="sign">
            <span v-if="row.type === 'added'">+</span>
            <span v-else-if="row.type === 'removed'">-</span>
          </td>
          <td
            class="code"
            :class="{
              'cell--added': row.type === 'added',
              'cell--removed': row.type === 'removed',
            }"
          >
            <span
              v-for="(seg, j) in row.segments"
              :key="j"
              :class="segClass(seg)"
              v-html="renderSegment(seg)"
            ></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.viewer {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: auto;
}
.diff-table {
  border-collapse: collapse;
  width: 100%;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}
.col-no {
  width: 48px;
}
.col-sign {
  width: 24px;
}
.col-code {
  width: auto;
}
.gutter {
  text-align: right;
  padding: 0 8px;
  color: var(--text-muted);
  background: var(--gutter-bg);
  border-right: 1px solid var(--border);
  user-select: none;
  white-space: nowrap;
  vertical-align: top;
}
.sign {
  text-align: center;
  color: var(--text-muted);
  user-select: none;
  vertical-align: top;
}
.code {
  padding: 0 10px;
  white-space: pre-wrap;
  word-break: break-word;
  vertical-align: top;
}
.cell--added {
  background: var(--added-bg);
}
.cell--removed {
  background: var(--removed-bg);
}
.seg--added {
  background: var(--added-char);
  border-radius: 2px;
}
.seg--removed {
  background: var(--removed-char);
  border-radius: 2px;
}
.row--added .code,
.row--removed .code {
  /* 行内视图整行底色已由 cell-- 控制 */
}
</style>
