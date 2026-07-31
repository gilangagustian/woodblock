// Synthesized sound effects (Web Audio) + haptics (Vibration API). No audio
// asset files needed — everything is generated with oscillators, gated by a
// single "sound & haptics" preference persisted in localStorage.
import { loadSoundEnabled, saveSoundEnabled } from './storage'

let enabled = loadSoundEnabled()
let audioCtx = null

export function isSoundEnabled() {
  return enabled
}

export function setSoundEnabled(value) {
  enabled = value
  saveSoundEnabled(value)
}

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function tone({ freq, start = 0, duration = 0.12, type = 'sine', volume = 0.18, glideTo = null }) {
  const ctx = getContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  const t0 = ctx.currentTime + start
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function vibrate(pattern) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // ignore — unsupported or blocked
  }
}

export function playPlace() {
  if (!enabled) return
  tone({ freq: 220, duration: 0.07, type: 'triangle', volume: 0.12 })
  vibrate(10)
}

export function playInvalid() {
  if (!enabled) return
  tone({ freq: 110, duration: 0.09, type: 'sine', volume: 0.1 })
}

const CLEAR_NOTES = [523.25, 659.25, 783.99, 987.77] // C5 E5 G5 B5

export function playClear(numLines) {
  if (!enabled) return
  const count = Math.min(numLines, CLEAR_NOTES.length)
  for (let i = 0; i < count; i++) {
    tone({ freq: CLEAR_NOTES[i], start: i * 0.06, duration: 0.16, type: 'sine', volume: 0.16 })
  }
  vibrate(numLines > 1 ? [15, 30, 15, 30] : [18])
}

export function playStreak(streak) {
  if (!enabled) return
  tone({ freq: 660, duration: 0.1, type: 'square', volume: 0.09, glideTo: 990 })
  tone({ freq: 990, start: 0.08, duration: 0.14, type: 'square', volume: 0.1 })
  vibrate([20, 40, 20, 40, Math.min(20 + streak * 4, 60)])
}

export function playGameOver() {
  if (!enabled) return
  tone({ freq: 392, duration: 0.18, type: 'sawtooth', volume: 0.14 })
  tone({ freq: 329.63, start: 0.16, duration: 0.18, type: 'sawtooth', volume: 0.14 })
  tone({ freq: 261.63, start: 0.32, duration: 0.28, type: 'sawtooth', volume: 0.14 })
  vibrate([40, 60, 40, 60, 80])
}
