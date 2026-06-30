<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const leftSrc = ref('')
const rightSrc = ref('')
const leftMeta = ref(null)
const rightMeta = ref(null)

const mode = ref('side') // 'side' | 'slider' | 'diff'
const sliderPos = ref(50)
const diffCanvas = ref(null)

function loadImage(file, side) {
  if (!file || !file.type.startsWith('image/')) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const meta = { name: file.name, width: img.naturalWidth, height: img.naturalHeight }
    if (side === 'left') {
      leftSrc.value = url
      leftMeta.value = meta
    } else {
      rightSrc.value = url
      rightMeta.value = meta
    }
  }
  img.src = url
}

function onFile(e, side) {
  loadImage(e.target.files?.[0], side)
  e.target.value = ''
}
function onDrop(e, side) {
  loadImage(e.dataTransfer?.files?.[0], side)
}

const bothLoaded = computed(() => leftSrc.value && rightSrc.value)
const sizeMismatch = computed(
  () =>
    leftMeta.value &&
    rightMeta.value &&
    (leftMeta.value.width !== rightMeta.value.width ||
      leftMeta.value.height !== rightMeta.value.height)
)

// 差异叠加：逐像素比较，差异处高亮
function renderDiff() {
  const canvas = diffCanvas.value
  if (!canvas || !bothLoaded.value) return
  const imgA = new Image()
  const imgB = new Image()
  let loaded = 0
  const onBoth = () => {
    if (++loaded < 2) return
    const w = Math.min(imgA.naturalWidth, imgB.naturalWidth)
    const h = Math.min(imgA.naturalHeight, imgB.naturalHeight)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    const ca = document.createElement('canvas')
    ca.width = w
    ca.height = h
    const cb = document.createElement('canvas')
    cb.width = w
    cb.height = h
    ca.getContext('2d').drawImage(imgA, 0, 0, w, h)
    cb.getContext('2d').drawImage(imgB, 0, 0, w, h)

    const da = ca.getContext('2d').getImageData(0, 0, w, h)
    const db = cb.getContext('2d').getImageData(0, 0, w, h)
    const out = ctx.createImageData(w, h)
    const threshold = 30
    for (let i = 0; i < da.data.length; i += 4) {
      const dr = Math.abs(da.data[i] - db.data[i])
      const dg = Math.abs(da.data[i + 1] - db.data[i + 1])
      const dbl = Math.abs(da.data[i + 2] - db.data[i + 2])
      const diff = dr + dg + dbl > threshold
      if (diff) {
        // 差异像素：洋红高亮
        out.data[i] = 255
        out.data[i + 1] = 0
        out.data[i + 2] = 128
        out.data[i + 3] = 255
      } else {
        // 相同像素：淡化为灰度背景
        const gray = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3
        const faded = 200 + gray * 0.2
        out.data[i] = faded
        out.data[i + 1] = faded
        out.data[i + 2] = faded
        out.data[i + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)
  }
  imgA.onload = onBoth
  imgB.onload = onBoth
  imgA.src = leftSrc.value
  imgB.src = rightSrc.value
}

watch([mode, leftSrc, rightSrc], async () => {
  if (mode.value === 'diff' && bothLoaded.value) {
    await nextTick()
    renderDiff()
  }
})
</script>

<template>
  <section>
    <!-- 上传区 -->
    <div class="uploads">
      <div
        class="upload"
        @dragover.prevent
        @drop.prevent="onDrop($event, 'left')"
      >
        <div class="upload__bar">
          <span>原始图片</span>
          <label class="link-btn"
            >选择<input type="file" accept="image/*" @change="onFile($event, 'left')"
          /></label>
        </div>
        <div class="upload__body">
          <img v-if="leftSrc" :src="leftSrc" alt="原始图片" />
          <span v-else class="upload__hint">拖入或选择图片</span>
        </div>
        <div v-if="leftMeta" class="upload__meta">
          {{ leftMeta.name }} · {{ leftMeta.width }}×{{ leftMeta.height }}
        </div>
      </div>

      <div
        class="upload"
        @dragover.prevent
        @drop.prevent="onDrop($event, 'right')"
      >
        <div class="upload__bar">
          <span>对比图片</span>
          <label class="link-btn"
            >选择<input
              type="file"
              accept="image/*"
              @change="onFile($event, 'right')"
          /></label>
        </div>
        <div class="upload__body">
          <img v-if="rightSrc" :src="rightSrc" alt="对比图片" />
          <span v-else class="upload__hint">拖入或选择图片</span>
        </div>
        <div v-if="rightMeta" class="upload__meta">
          {{ rightMeta.name }} · {{ rightMeta.width }}×{{ rightMeta.height }}
        </div>
      </div>
    </div>

    <div v-if="bothLoaded" class="mode-bar">
      <div class="view-switch">
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'side' }"
          @click="mode = 'side'"
        >
          并排
        </button>
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'slider' }"
          @click="mode = 'slider'"
        >
          滑块对比
        </button>
        <button
          class="view-switch__btn"
          :class="{ 'view-switch__btn--active': mode === 'diff' }"
          @click="mode = 'diff'"
        >
          差异高亮
        </button>
      </div>
      <span v-if="sizeMismatch" class="warn">
        ⚠ 两张图片尺寸不同，差异高亮将按较小尺寸比较
      </span>
    </div>

    <!-- 并排 -->
    <div v-if="bothLoaded && mode === 'side'" class="result-side">
      <img :src="leftSrc" alt="原始图片" />
      <img :src="rightSrc" alt="对比图片" />
    </div>

    <!-- 滑块 -->
    <div v-if="bothLoaded && mode === 'slider'" class="result-slider">
      <div class="slider-stage">
        <img class="slider-stage__base" :src="rightSrc" alt="对比图片" />
        <img
          class="slider-stage__overlay"
          :src="leftSrc"
          alt="原始图片"
          :style="{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }"
        />
        <div class="slider-stage__handle" :style="{ left: sliderPos + '%' }"></div>
      </div>
      <input
        class="slider-range"
        type="range"
        min="0"
        max="100"
        v-model.number="sliderPos"
      />
      <div class="slider-labels">
        <span>原始图片</span><span>对比图片</span>
      </div>
    </div>

    <!-- 差异高亮 -->
    <div v-if="bothLoaded && mode === 'diff'" class="result-diff">
      <canvas ref="diffCanvas"></canvas>
      <p class="result-diff__legend">
        <span class="dot"></span>洋红色区域表示两张图片存在差异的像素
      </p>
    </div>
  </section>
</template>

<style scoped>
.uploads {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.upload {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.upload__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--gutter-bg);
  font-weight: 600;
  font-size: 13px;
}
.link-btn {
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
}
.link-btn input {
  display: none;
}
.upload__body {
  min-height: 220px;
  display: grid;
  place-items: center;
  padding: 12px;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 50% / 20px 20px;
}
.upload__body img {
  max-width: 100%;
  max-height: 400px;
}
.upload__hint {
  color: var(--text-muted);
}
.upload__meta {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}
.mode-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 16px 0;
  flex-wrap: wrap;
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
.warn {
  font-size: 13px;
  color: #b45309;
}
.result-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.result-side img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 50% / 20px 20px;
}
.result-slider {
  max-width: 720px;
}
.slider-stage {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
}
.slider-stage__base {
  display: block;
  width: 100%;
}
.slider-stage__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.slider-stage__handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--primary);
  transform: translateX(-1px);
}
.slider-range {
  width: 100%;
  margin-top: 10px;
}
.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}
.result-diff canvas {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.result-diff__legend {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: rgb(255, 0, 128);
  display: inline-block;
}
@media (max-width: 720px) {
  .uploads,
  .result-side {
    grid-template-columns: 1fr;
  }
}
</style>
