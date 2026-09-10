// Google Analytics (GA4). Loaded only in production builds (see main.jsx)
// so local dev/preview traffic never pollutes real analytics data.
const MEASUREMENT_ID = 'G-R6PP5KLQP9'

export function initAnalytics() {
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
  gtag('config', MEASUREMENT_ID)
}
