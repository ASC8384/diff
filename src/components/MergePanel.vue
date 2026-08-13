<script setup>
/**
 * 合并结果面板：展示按「挑选合并」选择拼出的最终文本。
 * 行按来源着色（左侧淡红 / 右侧淡绿 / 相同无底色）。
 */
import { computed } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [] }, // { text, from } from: equal|left|right
  text: { type: String, default: '' },
  counts: { type: Object, default: () => ({}) }, // { left, right, both, none }
  copied: { type: Boolean, default: false },
})
const emit = defineEmits(['copy', 'download', 'apply', 'reset'])

// 大结果降级为纯文本，避免上万个逐行 DOM 节点拖慢页面
const PLAIN_LINE_LIMIT = 2000
const plain = computed(() => props.lines.length > PLAIN_LINE_LIMIT)

// 只展示非零项，摘要保持简短
const summary = computed(() => {
  const label = { left: '左', right: '右', both: '两者', none: '弃用' }
  return Object.entries(label)
    .filter(([k]) => props.counts[k])
    .map(([k, v]) => `${v} ${props.counts[k]}`)
    .join(' · ')
})
</script>

<template>
  <div class="merge">
    <div class="merge__bar">
      <div class="merge__meta">
        <span class="merge__title">合并结果</span>
        <span class="merge__note">{{ lines.length }} 行</span>
        <span v-if="summary" class="merge__note">{{ summary }}</span>
      </div>
      <div class="merge__actions">
        <button class="btn btn--sm" @click="emit('reset')">重置选择</button>
        <button class="btn btn--sm" @click="emit('copy')">
          {{ copied ? '已复制' : '复制结果' }}
        </button>
        <button class="btn btn--sm" @click="emit('download')">下载文本</button>
        <button class="btn btn--sm btn--primary" @click="emit('apply')">
          写入右侧
        </button>
      </div>
    </div>

    <p v-if="plain" class="merge__degraded">
      结果较大（{{ lines.length }} 行），已改用纯文本展示，不再逐行标注来源。
    </p>
    <pre v-if="plain" class="merge__plain">{{ text }}</pre>

    <table v-else class="merge__table">
      <colgroup>
        <col class="merge__col-no" />
        <col />
      </colgroup>
      <tbody>
        <tr v-for="(line, i) in lines" :key="i">
          <td class="merge__gutter">{{ i + 1 }}</td>
          <td class="merge__code" :class="'merge__code--' + line.from">
            {{ line.text }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!lines.length" class="merge__empty">
      所有差异都被弃用，合并结果为空。
    </p>
  </div>
</template>

<style scoped>
.merge {
  margin-top: 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: auto;
  max-height: 520px;
  box-shadow: var(--shadow-sm);
}
.merge__bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--panel-soft);
  border-bottom: 1px solid var(--border);
}
.merge__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.merge__title {
  font-size: 13px;
  font-weight: 600;
}
.merge__note {
  font-size: 12px;
  color: var(--text-muted);
}
.merge__actions {
  display: flex;
  gap: 8px;
}
.btn {
  border: 1px solid var(--border-strong);
  background: var(--panel);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  transition: border-color 0.16s, color 0.16s, background 0.16s;
}
.btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.btn--primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: #fff;
}
.merge__table {
  border-collapse: collapse;
  width: 100%;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
}
.merge__col-no {
  width: 52px;
}
.merge__gutter {
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
.merge__code {
  padding: 0 12px;
  white-space: pre-wrap;
  word-break: break-word;
  vertical-align: top;
}
.merge__code--left {
  background: var(--removed-bg);
  box-shadow: inset 3px 0 0 var(--removed-fg);
}
.merge__code--right {
  background: var(--added-bg);
  box-shadow: inset 3px 0 0 var(--added-fg);
}
.merge__degraded,
.merge__empty {
  margin: 0;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--text-muted);
}
.merge__plain {
  margin: 0;
  padding: 0 14px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
}
</style>
