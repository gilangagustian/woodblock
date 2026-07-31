const STORAGE_KEY = 'woodblock:bestScores'

export function loadBestScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveBestScore(difficultyKey, score) {
  try {
    const scores = loadBestScores()
    if (score > (scores[difficultyKey] || 0)) {
      scores[difficultyKey] = score
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
    }
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.) — best score just won't persist.
  }
}
