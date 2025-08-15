# Cycling Birthday Winners (app05)

A Next.js 14 app that shows which professional cyclists won a race on your birthday. It scrapes FirstCycling race pages across categories `t=1..24` for a given year (default 2025).

## Development

- Install dependencies:
```bash
cd apps/app05
npm i
npm run dev
```
- Open `http://localhost:3025`.

## Notes

- The API endpoint `/api/winners` performs basic HTML scraping via `cheerio`.
- External site structure can change; parsing logic is best-effort and resilient to common variants.
- Be respectful with scraping: requests are rate-limited with small delays.
