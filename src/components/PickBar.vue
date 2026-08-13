<script setup>
/**
 * 挑选合并的选取条：横跨整行插入在每处差异上方。
 * 并排视图与行内视图共用（两者代码区都是 4 列）。
 */
import { CHOICES } from '../utils/merge.js'

defineProps({
  hunkId: { type: Number, required: true },
  total: { type: Number, default: 0 },
  choice: { type: String, default: 'right' },
})
const emit = defineEmits(['choose'])
</script>

<template>
  <tr class="pick-row" data-export-ignore>
    <td class="pick-cell" colspan="4">
      <div class="pick-cell__inner">
        <span class="pick-cell__label">差异 {{ hunkId + 1 }} / {{ total }}</span>
        <span class="pick-cell__btns">
          <button
            v-for="c in CHOICES"
            :key="c.key"
            class="pick-btn"
            :class="{ 'pick-btn--on': choice === c.key }"
            type="button"
            :aria-pressed="choice === c.key"
            @click="emit('choose', hunkId, c.key)"
          >
            {{ c.label }}
          </button>
        </span>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.pick-cell {
  padding: 5px 12px;
  background: var(--gutter-bg);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-sans);
}
.pick-cell__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pick-cell__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  user-select: none;
}
.pick-cell__btns {
  display: flex;
  gap: 6px;
}
.pick-btn {
  border: 1px solid var(--border-strong);
  background: var(--panel);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  transition: color 0.16s, border-color 0.16s, background 0.16s;
}
.pick-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.pick-btn--on {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}
</style>
