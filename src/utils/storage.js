/**
 * localStorage 读写封装。
 *
 * 所有操作包 try/catch：隐私模式、配额超限或被禁用时静默降级，
 * 不影响主流程。value 统一 JSON 序列化。
 */

const PREFIX = 'diff-checker:'

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    // 配额超限 / 隐私模式：放弃持久化，不抛出
    return false
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 忽略 */
  }
}
