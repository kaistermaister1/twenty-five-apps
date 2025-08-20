# Recipe Helper (app13)

- Next.js 14 app with two tabs: Pantry and Recipes
- Add pantry items locally; generate 4 recipes via OpenAI `gpt-5-nano`
- iOS-friendly standalone PWA

## Setup

1. `cd apps/app13`
2. `npm i`
3. Set `OPENAI_API_KEY` in your environment (Vercel project or `.env.local`)
4. `npm run dev`

## API

POST `/api/generate`
Body: `{ "pantry": string[] }`
Response: `{ "code": string }` containing TS code defining `const recipes = [...]`.
