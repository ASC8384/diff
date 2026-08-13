<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const dialog = ref(null)

// 用原生 <dialog> 的模态能力：自带背景遮罩、Esc 关闭与焦点陷阱
watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }
)

function onClose() {
  emit('close')
}

// 点击遮罩（dialog 自身而非内容区）时关闭
function onClick(e) {
  if (e.target === dialog.value) emit('close')
}

const shortcuts = [
  { keys: ['Alt', '↓'], desc: '跳到下一处差异' },
  { keys: ['Alt', '↑'], desc: '跳到上一处差异' },
  { keys: ['Alt', '←'], desc: '当前差异改用左侧（需开启挑选合并）' },
  { keys: ['Alt', '→'], desc: '当前差异改用右侧（需开启挑选合并）' },
  { keys: ['Esc'], desc: '关闭本帮助' },
]
</script>

<template>
  <dialog ref="dialog" class="help" @close="onClose" @click="onClick">
    <div class="help__panel">
      <header class="help__head">
        <h2 class="help__title">使用帮助</h2>
        <button class="help__x" type="button" aria-label="关闭" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="help__body">
        <section class="help__sec">
          <h3>文本 / 代码对比</h3>
          <ul>
            <li>在左右两栏粘贴文本，或拖入 / 选择文件后点「对比差异」。</li>
            <li><b>实时对比</b>开启后，编辑内容或改动选项会自动重算，无需手动点击。</li>
            <li>
              三种视图：<b>并排</b>左右分栏、<b>行内</b>单栏加 +/- 标记、<b>补丁</b>标准
              unified diff（可下载 .patch 或复制）。
            </li>
            <li>相同的大段内容会自动折叠，点折叠条即可展开；也可用工具条「显示全部行」。</li>
            <li>可选<b>忽略大小写</b>、<b>忽略空白</b>、开关<b>语法高亮</b>；结果支持导出图片。</li>
          </ul>
        </section>

        <section class="help__sec">
          <h3>挑选合并</h3>
          <ul>
            <li>
              点工具栏<b>挑选合并</b>后，每处差异上方出现选取条，可选
              <b>用左侧</b>、<b>用右侧</b>、<b>两者</b>（左块整段后接右块整段）或<b>弃用</b>。
            </li>
            <li>默认全部用右侧，即等于「修改后内容」；只需改动想保留左侧的那几处。</li>
            <li>工具条的<b>批量</b>按钮可一次全选左侧或右侧，面板上的「重置选择」回到默认。</li>
            <li>页面最下方实时给出合并结果，行按来源着色，可<b>复制</b>、<b>下载文本</b>。</li>
            <li>
              <b>写入右侧</b>把结果回填到右侧输入框并重新对比，可分几轮逐步消化差异。
            </li>
          </ul>
        </section>

        <section class="help__sec">
          <h3>图片对比</h3>
          <ul>
            <li><b>并排</b>：两图左右并列查看。</li>
            <li><b>滑块对比</b>：拖动滑块揭示上下层图片，适合找细微改动。</li>
            <li><b>差异高亮</b>：逐像素比较，差异处以洋红标出；尺寸不同则按较小尺寸比较。</li>
          </ul>
        </section>

        <section class="help__sec">
          <h3>键盘快捷键</h3>
          <table class="help__keys">
            <tbody>
              <tr v-for="(s, i) in shortcuts" :key="i">
                <td>
                  <template v-for="(k, j) in s.keys" :key="j">
                    <kbd>{{ k }}</kbd
                    ><span v-if="j < s.keys.length - 1" class="help__plus">+</span>
                  </template>
                </td>
                <td>{{ s.desc }}</td>
              </tr>
            </tbody>
          </table>
          <p class="help__note">差异跳转快捷键在文本的并排 / 行内视图下生效。选边前先用 Alt+↑ / ↓ 定位到某处差异。</p>
        </section>

        <section class="help__sec">
          <h3>隐私</h3>
          <ul>
            <li>所有对比都在浏览器本地完成，文本与图片<b>不会上传</b>到任何服务器。</li>
            <li>输入内容与选项会存在本地浏览器（localStorage），方便下次继续。</li>
          </ul>
        </section>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.help {
  border: none;
  padding: 0;
  background: transparent;
  max-width: 100vw;
  max-height: 100vh;
}
.help::backdrop {
  background: rgba(10, 12, 20, 0.45);
  backdrop-filter: blur(2px);
}
.help__panel {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  color: var(--text);
}
.help__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.help__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
}
.help__x {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: color 0.16s, background 0.16s;
}
.help__x:hover {
  color: var(--text);
  background: var(--bg-soft);
}
.help__body {
  padding: 8px 20px 20px;
  overflow: auto;
}
.help__sec {
  margin-top: 16px;
}
.help__sec h3 {
  margin: 0 0 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--primary);
}
.help__sec ul {
  margin: 0;
  padding-left: 18px;
}
.help__sec li {
  font-size: 13px;
  line-height: 1.75;
  color: var(--text);
}
.help__sec b {
  font-weight: 600;
}
.help__keys {
  border-collapse: collapse;
  font-size: 13px;
}
.help__keys td {
  padding: 4px 14px 4px 0;
  color: var(--text);
  vertical-align: middle;
}
kbd {
  display: inline-block;
  min-width: 20px;
  text-align: center;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: var(--bg-soft);
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  box-shadow: var(--shadow-sm);
}
.help__plus {
  color: var(--text-muted);
  margin: 0 4px;
}
.help__note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
