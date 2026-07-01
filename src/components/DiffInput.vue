<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '在此粘贴文本，或拖入 / 选择文件…' },
})
const emit = defineEmits(['update:modelValue', 'file-name'])

const dragOver = ref(false)
const fileInput = ref(null)

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function readFile(file) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    emit('update:modelValue', String(reader.result ?? ''))
    emit('file-name', file.name)
  }
  reader.readAsText(file)
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
</style>
