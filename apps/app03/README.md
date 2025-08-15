# Time Tracker (App 03)

Minimal time tracking PWA. Start/stop sessions for categories, edit categories in Settings, view totals (Today / All time) and recent sessions. Data is stored in localStorage.

## iOS fullscreen (edge-to-edge)

- In `index.html` head:
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`
  - `<meta name="apple-mobile-web-app-capable" content="yes" />`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`

- In `styles.css`:
  - Make root elements full height: `html, body { height: 100%; }`
  - Use fixed, full-bleed backgrounds that extend under the notch/home indicator with `env(safe-area-inset-*)` (and `constant()` fallback):
    - `body::before` and `body::after` are positioned `fixed` and inset by negative safe-area values to cover the full screen.
  - Ensure content respects safe areas: `main { min-height: 100vh; min-height: 100dvh; padding: calc(… + env(safe-area-inset-*)); }`

This combination allows the app to extend fully edge-to-edge on iOS when installed to the home screen and also look correct in Safari.


