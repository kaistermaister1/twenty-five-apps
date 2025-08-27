# Morse Realtime (App 20)

Beautiful minimal UI, realtime Morse streaming over Supabase Realtime.

## How it works

- Host generates a short code (e.g. `rom-uni-42`). The app joins channel `morse-<code>`.
- Guest inputs the code to join the same channel.
- Press the red button: short press = dot `.`, long press = dash `-`. Tap word gap to insert `/`.
- Tokens are broadcast in realtime. Two canvases draw outgoing/incoming tokens on a ruled sheet.

Rendering strategy (PaperCanvas):
- The canvas is laid out as a grid of token cells left-to-right, wrapping to new lines.
- Each dot/dash is drawn as a short/long horizontal stroke at the current cell.
- When the sheet fills, the canvas scrolls up by one line to simulate paper feed.

## Setup

1) Create a Supabase project.
2) In project settings → API, copy:
   - Project URL → set as `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → set as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For local dev, create `apps/app20/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

No database tables are needed; we only use Realtime broadcast channels.

## Run

```
cd apps/app20
npm i
npm run dev
```

Open http://localhost:3020 on two devices, Host on one, Join with the code on the other.
