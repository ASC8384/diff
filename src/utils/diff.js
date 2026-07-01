import { diffLines, diffWordsWithSpace } from 'diff'

/**
 * 差异对比核心工具。
 *
 * 基于 jsdiff：
 *  - diffLines 计算行级增删
 *  - 对成对出现的「删除块 + 新增块」逐行做字符级 diffWordsWithSpace，
 *    实现行内精确高亮
 *
 * 输出两套结构：
 *  - rows：并排视图（左右两列对齐）
 *  - inlineRows：行内统一视图（单列，带 +/- 标记）
 */

/**
 * 根据选项对文本做预处理（仅用于比较，展示仍用原文）。
 */
function normalize(text, { ignoreCase, ignoreWhitespace }) {
  let t = text
  if (ignoreCase) t = t.toLowerCase()
  if (ignoreWhitespace) {
    // 去掉行首尾空白，并将连续空白压缩为单个空格
    t = t
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .join('\n')
  }
  return t
}

/**
 * 将一段（多行）文本切成行数组，去除末尾因 split 产生的空串。
 */
function splitLines(value) {
  const lines = value.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * 对一对「删除行 / 新增行」计算字符级片段。
 * 返回 { leftSegments, rightSegments }，每个片段 { value, type }。
 * type: 'equal' | 'removed' | 'added'
 */
function charDiff(oldLine, newLine) {
  const parts = diffWordsWithSpace(oldLine, newLine)
  const leftSegments = []
  const rightSegments = []
  for (const part of parts) {
    if (part.added) {
      rightSegments.push({ value: part.value, type: 'added' })
    } else if (part.removed) {
      leftSegments.push({ value: part.value, type: 'removed' })
    } else {
      leftSegments.push({ value: part.value, type: 'equal' })
      rightSegments.push({ value: part.value, type: 'equal' })
    }
  }
  return { leftSegments, rightSegments }
}

// 超过该行数（两侧之和）时进入降级模式：跳过字符级行内高亮，
// 只做行级 diff，避免大文本下 diffWordsWithSpace 逐行运算卡住 UI。
const CHAR_DIFF_LINE_LIMIT = 5000

/**
 * 主入口。
 * @param {string} oldText 原始文本
 * @param {string} newText 新文本
 * @param {object} options { ignoreCase, ignoreWhitespace }
 * @returns {{ rows, inlineRows, stats }}
 */
export function computeDiff(oldText, newText, options = {}) {
  const opts = {
    ignoreCase: !!options.ignoreCase,
    ignoreWhitespace: !!options.ignoreWhitespace,
  }

  // 用归一化文本计算差异，但展示时映射回原始行
  const oldNorm = normalize(oldText, opts)
  const newNorm = normalize(newText, opts)
  const oldOrig = splitLines(oldText)
  const newOrig = splitLines(newText)

  // 大文本降级：跳过字符级行内高亮
  const degraded = oldOrig.length + newOrig.length > CHAR_DIFF_LINE_LIMIT

  const changes = diffLines(oldNorm, newNorm)

  const rows = []
  const inlineRows = []
  let oldIdx = 0
  let newIdx = 0
  let addedCount = 0
  let removedCount = 0

  // 将 changes 转成块序列，便于把相邻的 removed/added 配对
  const blocks = changes.map((c) => ({
    type: c.added ? 'added' : c.removed ? 'removed' : 'equal',
    count: splitLines(c.value).length,
  }))

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (block.type === 'equal') {
      for (let k = 0; k < block.count; k++) {
        const left = oldOrig[oldIdx]
        const right = newOrig[newIdx]
        rows.push({
          type: 'equal',
          leftNo: oldIdx + 1,
          rightNo: newIdx + 1,
          leftSegments: [{ value: left, type: 'equal' }],
          rightSegments: [{ value: right, type: 'equal' }],
        })
        inlineRows.push({
          type: 'equal',
          leftNo: oldIdx + 1,
          rightNo: newIdx + 1,
          segments: [{ value: right, type: 'equal' }],
        })
        oldIdx++
        newIdx++
      }
      continue
    }

    // 处理 removed，可能后跟一个 added 块（视为「修改」）
    if (block.type === 'removed') {
      const next = blocks[i + 1]
      const pairedAdded = next && next.type === 'added' ? next : null
      const pairCount = pairedAdded
        ? Math.min(block.count, pairedAdded.count)
        : 0

      // 配对部分：逐行字符级 diff（降级时退化为整行增删）
      for (let k = 0; k < pairCount; k++) {
        const oldLine = oldOrig[oldIdx]
        const newLine = newOrig[newIdx]
        const { leftSegments, rightSegments } = degraded
          ? {
              leftSegments: [{ value: oldLine, type: 'removed' }],
              rightSegments: [{ value: newLine, type: 'added' }],
            }
          : charDiff(oldLine, newLine)
        rows.push({
          type: 'modified',
          leftNo: oldIdx + 1,
          rightNo: newIdx + 1,
          leftSegments,
          rightSegments,
        })
        inlineRows.push({
          type: 'removed',
          leftNo: oldIdx + 1,
          rightNo: null,
          segments: leftSegments,
        })
        inlineRows.push({
          type: 'added',
          leftNo: null,
          rightNo: newIdx + 1,
          segments: rightSegments,
        })
        removedCount++
        addedCount++
        oldIdx++
        newIdx++
      }

      // removed 块剩余行（纯删除）
      for (let k = pairCount; k < block.count; k++) {
        const oldLine = oldOrig[oldIdx]
        rows.push({
          type: 'removed',
          leftNo: oldIdx + 1,
          rightNo: null,
          leftSegments: [{ value: oldLine, type: 'removed' }],
          rightSegments: null,
        })
        inlineRows.push({
          type: 'removed',
          leftNo: oldIdx + 1,
          rightNo: null,
          segments: [{ value: oldLine, type: 'removed' }],
        })
        removedCount++
        oldIdx++
      }

      // added 块剩余行（纯新增）
      if (pairedAdded) {
        for (let k = pairCount; k < pairedAdded.count; k++) {
          const newLine = newOrig[newIdx]
          rows.push({
            type: 'added',
            leftNo: null,
            rightNo: newIdx + 1,
            leftSegments: null,
            rightSegments: [{ value: newLine, type: 'added' }],
          })
          inlineRows.push({
            type: 'added',
            leftNo: null,
            rightNo: newIdx + 1,
            segments: [{ value: newLine, type: 'added' }],
          })
          addedCount++
          newIdx++
        }
        i++ // 已消费下一个 added 块
      }
      continue
    }

    // 单独的 added 块（前面没有 removed 配对）
    if (block.type === 'added') {
      for (let k = 0; k < block.count; k++) {
        const newLine = newOrig[newIdx]
        rows.push({
          type: 'added',
          leftNo: null,
          rightNo: newIdx + 1,
          leftSegments: null,
          rightSegments: [{ value: newLine, type: 'added' }],
        })
        inlineRows.push({
          type: 'added',
          leftNo: null,
          rightNo: newIdx + 1,
          segments: [{ value: newLine, type: 'added' }],
        })
        addedCount++
        newIdx++
      }
    }
  }

  return {
    rows,
    inlineRows,
    stats: {
      added: addedCount,
      removed: removedCount,
      identical: addedCount === 0 && removedCount === 0,
      degraded,
    },
  }
}
