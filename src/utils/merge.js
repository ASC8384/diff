/**
 * 挑选合并（cherry-pick merge）。
 *
 * 按用户对每处差异（hunk）的选择，把两侧内容拼成一份最终文本。
 * 相同行以右侧原文为基线 —— 开启「忽略大小写 / 忽略空白」时两侧原文
 * 可能不同，这与补丁导出的语义保持一致。
 */

/** 每处差异的可选动作 */
export const CHOICES = [
  { key: 'left', label: '用左侧' },
  { key: 'right', label: '用右侧' },
  { key: 'both', label: '两者' },
  { key: 'none', label: '弃用' },
]

const DEFAULT_CHOICE = 'right'

/**
 * 为一批 hunk 生成默认选择（全部用右侧，即等于右侧全文）。
 * @param {Array} hunks computeDiff 产出的 hunks
 * @returns {Record<number, string>}
 */
export function defaultChoices(hunks = []) {
  const out = {}
  for (const h of hunks) out[h.id] = DEFAULT_CHOICE
  return out
}

/**
 * 按选择拼装合并结果。
 *
 * 以 hunk 为单位输出（而非逐行），这样 'both' 得到的是「左块整段 +
 * 右块整段」，而不是左右逐行交错。
 *
 * @param {Array} rows computeDiff 产出的并排行
 * @param {Array} hunks computeDiff 产出的差异块
 * @param {Record<number, string>} choices { [hunkId]: 'left'|'right'|'both'|'none' }
 * @param {object} options { trailingNewline } 结果是否以换行结尾
 * @returns {{ text: string, lines: Array<{ text: string, from: string }> }}
 *          lines 的 from 为 'equal' | 'left' | 'right'，供面板着色
 */
export function buildMerged(rows = [], hunks = [], choices = {}, options = {}) {
  const trailingNewline = options.trailingNewline !== false
  const byId = new Map(hunks.map((h) => [h.id, h]))
  const lines = []

  let i = 0
  while (i < rows.length) {
    const row = rows[i]

    if (row.hunkId == null) {
      lines.push({ text: row.rightSegments?.[0]?.value ?? '', from: 'equal' })
      i++
      continue
    }

    const id = row.hunkId
    const hunk = byId.get(id)
    const choice = choices[id] || DEFAULT_CHOICE
    if (hunk) {
      if (choice === 'left' || choice === 'both') {
        for (const text of hunk.leftLines) lines.push({ text, from: 'left' })
      }
      if (choice === 'right' || choice === 'both') {
        for (const text of hunk.rightLines) lines.push({ text, from: 'right' })
      }
    }
    // 跳过该 hunk 的其余行（整块已一次性输出）
    while (i < rows.length && rows[i].hunkId === id) i++
  }

  const text =
    lines.length === 0
      ? ''
      : lines.map((l) => l.text).join('\n') + (trailingNewline ? '\n' : '')

  return { text, lines }
}

/**
 * 统计各类选择的数量，供面板显示摘要。
 * @param {Array} hunks
 * @param {Record<number, string>} choices
 * @returns {{ left: number, right: number, both: number, none: number }}
 */
export function countChoices(hunks = [], choices = {}) {
  const out = { left: 0, right: 0, both: 0, none: 0 }
  for (const h of hunks) {
    const c = choices[h.id] || DEFAULT_CHOICE
    if (c in out) out[c]++
  }
  return out
}
