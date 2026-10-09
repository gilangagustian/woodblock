// Google Analytics (GA4). Loaded only in production builds (see main.jsx) and only
// after the visitor has agreed in the consent banner (see consent.js). Nothing is
// fetched from Google and no Google cookie is set before that.
const MEASUREMENT_ID = 'G-R6PP5KLQP9'

export function loadAnalytics() {
  window[`ga-disable-${MEASUREMENT_ID}`] = false
  if (window.__gaLoaded) return
  window.__gaLoaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, { anonymize_ip: true })
}

// Switches Analytics off and removes its cookies (used when consent is withdrawn).
export function stopAnalytics() {
  window[`ga-disable-${MEASUREMENT_ID}`] = true
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim())
  const parts = location.hostname.split('.')
  const domains = ['', location.hostname, `.${location.hostname}`]
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`)
  for (const name of names) {
    if (name !== '_ga' && name !== '_gid' && !name.startsWith('_ga_')) continue
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}
