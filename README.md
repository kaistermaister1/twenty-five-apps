# Fifty Apps Monorepo

Each app is a standalone PWA in `apps/appNN`.

## New App
1. Copy an existing folder (e.g., `app01` → `app02`).
2. Update `<title>` in `index.html` and `"name"`/`"short_name"` in `manifest.json`.
3. Edit HTML, CSS, and JS as needed.

## Test Locally
```bash
cd apps/app02
python -m http.server
