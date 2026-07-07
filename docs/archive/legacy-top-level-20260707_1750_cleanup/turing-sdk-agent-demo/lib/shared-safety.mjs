export function redactSecrets(text) {
  return String(text ?? '')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-***REDACTED***')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, 'AIza***REDACTED***')
    .replace(/github_pat_[0-9A-Za-z_]{20,}/g, 'github_pat_***REDACTED***')
    .replace(/ghp_[0-9A-Za-z]{20,}/g, 'ghp_***REDACTED***')
    .replace(/xox[baprs]-[0-9A-Za-z-]{20,}/g, 'xox***REDACTED***')
}

export function containsFullSecret(text) {
  return /sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|github_pat_[0-9A-Za-z_]{20,}|ghp_[0-9A-Za-z]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}/.test(String(text ?? ''))
}

export function looksLikeLegalAdviceRequest(text) {
  return /(胜诉率|赢面|怎么打赢|必赢|法律意见|律师意见|诉讼策略|该不该起诉|能不能起诉|判几年|怎么规避责任)/.test(String(text ?? ''))
}

export function parseJsonObject(text, fallback = {}) {
  try {
    const json = String(text ?? '').match(/\{[\s\S]*\}/)?.[0] || text
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

export function parseJsonArray(text, fallback = []) {
  try {
    const json = String(text ?? '').match(/\[[\s\S]*\]/)?.[0] || text
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}
