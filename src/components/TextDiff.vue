<script setup>
import { ref, computed, shallowRef } from 'vue'
import DiffInput from './DiffInput.vue'
import DiffViewer from './DiffViewer.vue'
import { computeDiff } from '../utils/diff.js'
import 'highlight.js/styles/github.css'

const leftText = ref('')
const rightText = ref('')
const leftName = ref('')
const rightName = ref('')

const mode = ref('split') // 'split' | 'inline'
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)
const highlight = ref(true)

const result = shallowRef(null)
const compared = ref(false)

function compare() {
  result.value = computeDiff(leftText.value, rightText.value, {
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
  })
  compared.value = true
}

function swap() {
  ;[leftText.value, rightText.value] = [rightText.value, leftText.value]
  ;[leftName.value, rightName.value] = [rightName.value, leftName.value]
  if (compared.value) compare()
}

const stats = computed(() => result.value?.stats)
const canCompare = computed(
  () => leftText.value.length > 0 || rightText.value.length > 0
)
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
      <button class="btn btn--primary" :disabled="!canCompare" @click="compare">
        对比差异
      </button>
      <button class="btn" @click="swap">交换两侧</button>

      <span class="toolbar__sep"></span>

      <label class="opt"
        ><input type="checkbox" v-model="ignoreCase" />忽略大小写</label
      >
      <label class="opt"
        ><input type="checkbox" v-model="ignoreWhitespace" />忽略空白</label
      >
      <label class="opt"
        ><input type="checkbox" v-model="highlight" />语法高亮</label
      >

      <span class="toolbar__sep"></span>

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
      </div>
    </div>

    <div v-if="compared && stats" class="stats">
      <template v-if="stats.identical">
        <span class="stats__same">✓ 两侧内容完全相同</span>
      </template>
      <template v-else>
        <span class="stats__added">+ {{ stats.added }} 行新增</span>
        <span class="stats__removed">- {{ stats.removed }} 行删除</span>
      </template>
    </div>

    <DiffViewer
      v-if="compared && stats && !stats.identical"
      :rows="result.rows"
      :inline-rows="result.inlineRows"
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
  gap: 12px;
  flex-wrap: wrap;
  margin: 16px 0;
}
.btn {
  border: 1px solid var(--border);
  background: var(--panel);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
}
.btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  color: #fff;
}
.toolbar__sep {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.opt {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}
.view-switch {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.view-switch__btn {
  border: none;
  background: var(--panel);
  padding: 7px 14px;
  font-size: 13px;
  color: var(--text-muted);
}
.view-switch__btn--active {
  background: var(--primary);
  color: #fff;
}
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
}
.stats__added {
  color: #1a7f37;
}
.stats__removed {
  color: #cf222e;
}
.stats__same {
  color: #1a7f37;
}
@media (max-width: 720px) {
  .inputs {
    grid-template-columns: 1fr;
  }
}
</style>
