/**
 * Scrolls the portal content area to the top.
 * The main scroll container is .portal-content — not window.
 */
export function scrollToTop() {
  const el = document.querySelector('.portal-content')
  if (el) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
