import { loadAnalytics, stopAnalytics } from './analytics.js'

// The visitor's analytics choice lives in localStorage for a year. Until they say
// yes, Google Analytics is never loaded. The footer's "Cookie settings" link calls
// openConsentSettings() so the choice can be changed at any time.
const KEY = 'woodblock:consentAnalytics'
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
const PRIVACY_URL = 'https://ideathatworks.de/datenschutz.html'

let banner = null

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    if (!v || (v.v !== 'granted' && v.v !== 'denied')) return null
    if (Date.now() - new Date(v.t).getTime() > MAX_AGE_MS) return null
    return v.v
  } catch {
    return null
  }
}

function write(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: value, t: new Date().toISOString() }))
  } catch {
    // storage unavailable: the choice just won't persist
  }
}

function hide() {
  banner?.remove()
  banner = null
}

function choose(value) {
  write(value)
  hide()
  if (value === 'granted') loadAnalytics()
  else stopAnalytics()
}

export function openConsentSettings() {
  if (banner) return
  banner = document.createElement('div')
  banner.className = 'consent'
  banner.setAttribute('role', 'dialog')
  banner.setAttribute('aria-label', 'Cookie consent')
  banner.innerHTML =
    '<p class="consent-text">Woodblock can use Google Analytics to count visits. It only loads if you agree, and the game plays the same either way. ' +
    `Details in the <a href="${PRIVACY_URL}">privacy notice (Datenschutz)</a>.</p>` +
    '<div class="consent-actions">' +
    '<button type="button" data-choice="granted">Accept</button>' +
    '<button type="button" data-choice="denied">Decline</button>' +
    '</div>'
  banner.addEventListener('click', (e) => {
    const choice = e.target?.getAttribute?.('data-choice')
    if (choice) choose(choice)
  })
  document.body.appendChild(banner)
}

export function initConsent() {
  const current = read()
  if (current === 'granted') loadAnalytics()
  else if (current === null) openConsentSettings()
}
