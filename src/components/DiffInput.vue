<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '在此粘贴文本，或拖入 / 选择文件…' },
  maxSizeMB: { type: Number, default: 5 }, // 文件大小上限（MB），0 表示不限制
})
const emit = defineEmits(['update:modelValue', 'file-name', 'update:maxSizeMB'])

const dragOver = ref(false)
const fileInput = ref(null)

// 超上限时暂存待确认的文件，渲染提示条让用户决定是否仍要载入
const pending = ref(null) // { file, size } | null
const limitDraft = ref(props.maxSizeMB)

const maxBytes = computed(() =>
  props.maxSizeMB > 0 ? props.maxSizeMB * 1024 * 1024 : Infinity
)

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

// 真正读取文件为文本
function doRead(file) {
  const reader = new FileReader()
  reader.onload = () => {
    emit('update:modelValue', String(reader.result ?? ''))
    emit('file-name', file.name)
  }
  reader.readAsText(file)
}

// 载入入口：超上限则暂存待确认，否则直接读
function readFile(file) {
  if (!file) return
  pending.value = null
  if (file.size > maxBytes.value) {
    pending.value = { file, size: file.size }
    limitDraft.value = props.maxSizeMB
    return
  }
  doRead(file)
}

// 用户点「仍要载入」：忽略上限直接读
function confirmPending() {
  if (!pending.value) return
  doRead(pending.value.file)
  pending.value = null
}

// 调整上限：若新上限已能覆盖待确认文件，则直接载入
function applyLimit() {
  const v = Number(limitDraft.value)
  const next = Number.isFinite(v) && v > 0 ? v : 0
  emit('update:maxSizeMB', next)
  if (pending.value) {
    const bytes = next > 0 ? next * 1024 * 1024 : Infinity
    if (pending.value.size <= bytes) {
      doRead(pending.value.file)
      pending.value = null
    }
  }
}

function cancelPending() {
  pending.value = null
}

function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  readFile(file)
}

function onFileChange(e) {
  readFile(e.target.files?.[0])
  e.target.value = '' // 允许重复选择同一文件
}

function clear() {
  emit('update:modelValue', '')
  emit('file-name', '')
  pending.value = null
}
</script>

<template>
  <div class="input-pane">
    <div class="input-pane__bar">
      <span class="input-pane__label">{{ label }}</span>
      <div class="input-pane__actions">
        <button class="link-btn" @click="fileInput.click()">上传文件</button>
        <button class="link-btn" @click="clear">清空</button>
      </div>
    </div>
    <div
      class="input-pane__drop"
      :class="{ 'input-pane__drop--over': dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <textarea
        class="input-pane__textarea"
        :value="modelValue"
        :placeholder="placeholder"
        spellcheck="false"
        @input="onInput"
      ></textarea>
      <div v-if="dragOver" class="input-pane__overlay">松开以载入文件</div>
    </div>

    <!-- 超上限确认条 -->
    <div v-if="pending" class="oversize">
      <p class="oversize__msg">
        「{{ pending.file.name }}」大小 {{ formatSize(pending.size) }}，
        超过上限 {{ maxSizeMB }}MB。大文件可能导致页面卡顿。
      </p>
      <div class="oversize__actions">
        <label class="oversize__limit">
          上限
          <input
            type="number"
            min="1"
            step="1"
            v-model.number="limitDraft"
            @keyup.enter="applyLimit"
          />
          MB
          <button class="link-btn" @click="applyLimit">应用</button>
        </label>
        <span class="oversize__sep">·</span>
        <button class="link-btn oversize__force" @click="confirmPending">
          仍要载入
        </button>
        <button class="link-btn" @click="cancelPending">取消</button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="input-pane__file"
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.input-pane {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.18s, box-shadow 0.18s;
}
.input-pane:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--ring);
}
.input-pane__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--panel-soft);
}
.input-pane__label {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.01em;
}
.input-pane__actions {
  display: flex;
  gap: 14px;
}
.link-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  padding: 0;
  transition: color 0.16s;
}
.link-btn:hover {
  color: var(--primary);
}
.input-pane__drop {
  position: relative;
  flex: 1;
}
.input-pane__drop--over .input-pane__textarea {
  filter: blur(1px);
}
.input-pane__textarea {
  width: 100%;
  height: 300px;
  resize: none;
  border: none;
  outline: none;
  padding: 14px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text);
  display: block;
}
.input-pane__textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}
.input-pane__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--primary-soft);
  border: 2px dashed var(--primary);
  border-radius: var(--radius);
  color: var(--primary);
  font-weight: 600;
  pointer-events: none;
}
.input-pane__file {
  display: none;
}

/* 超上限确认条 */
.oversize {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--panel-soft);
  font-size: 12.5px;
}
.oversize__msg {
  margin: 0 0 8px;
  color: var(--text);
  line-height: 1.6;
}
.oversize__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.oversize__limit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}
.oversize__limit input {
  width: 56px;
  padding: 3px 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--panel);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 12.5px;
}
.oversize__sep {
  color: var(--border-strong);
}
.oversize__force {
  color: var(--removed-fg);
}
</style>
