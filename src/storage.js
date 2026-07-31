const STORAGE_KEY = 'woodblock:bestScores'
const SOUND_KEY = 'woodblock:soundEnabled'

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

export function loadSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function saveSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled))
  } catch {
    // ignore
  }
}
