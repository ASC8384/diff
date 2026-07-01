import { createTwoFilesPatch } from 'diff'

/**
 * 生成标准 unified diff（补丁）文本。
 *
 * 复用 jsdiff 的 createTwoFilesPatch，输出可被 `git apply` / `patch` 消费。
 * 文件名缺省时用「原始内容 / 修改后内容」占位。
 *
 * @param {string} oldText
 * @param {string} newText
 * @param {object} names { oldName, newName }
 * @param {number} context 上下文行数，默认 3
 * @returns {string} unified diff
 */
export function buildPatch(oldText, newText, names = {}, context = 3) {
  const oldName = names.oldName || 'original'
  const newName = names.newName || 'modified'
  return createTwoFilesPatch(
    oldName,
    newName,
    oldText,
    newText,
    undefined,
    undefined,
    { context }
  )
}

/**
 * 将 unified diff 文本切成带类型的行，供补丁视图着色。
 * type: 'meta' | 'hunk' | 'added' | 'removed' | 'context'
 */
export function parsePatchLines(patch) {
  const lines = patch.split('\n')
  const result = []
  for (const line of lines) {
    let type = 'context'
    if (
      line.startsWith('Index:') ||
      line.startsWith('===') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      type = 'meta'
    } else if (line.startsWith('@@')) {
      type = 'hunk'
    } else if (line.startsWith('+')) {
      type = 'added'
    } else if (line.startsWith('-')) {
      type = 'removed'
    }
    result.push({ value: line, type })
  }
  return result
}
