# Recipe Helper (app13)

- Next.js 14 app with two tabs: Pantry and Recipes
- Add pantry items locally; generate 4 recipes via OpenAI `gpt-5-nano`
- iOS-friendly standalone PWA

## Supabase Setup (Accounts + Sync pantry/saved)

1) Create a Supabase project.

2) In project settings, copy:

- `Project URL` -> set as `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key -> set as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3) In this app directory, create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

4) Create tables and RLS policies (SQL editor):

```
create table if not exists app13_pantry (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items text[] not null default '{}'
);

alter table app13_pantry enable row level security;

create policy "own row read" on app13_pantry for select using (auth.uid() = user_id);
create policy "own row upsert" on app13_pantry for insert with check (auth.uid() = user_id);
create policy "own row update" on app13_pantry for update using (auth.uid() = user_id);

create table if not exists app13_saved (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recipes jsonb not null default '[]'
);

alter table app13_saved enable row level security;

create policy "own saved read" on app13_saved for select using (auth.uid() = user_id);
create policy "own saved upsert" on app13_saved for insert with check (auth.uid() = user_id);
create policy "own saved update" on app13_saved for update using (auth.uid() = user_id);
```

5) Run the dev server:

```
npm run dev
```

6) In the app, use the top-right Sign in to create an account or login.

## Setup

1. `cd apps/app13`
2. `npm i`
3. Set `OPENAI_API_KEY` in your environment (Vercel project or `.env.local`)
4. `npm run dev`

## API

POST `/api/generate`
Body: `{ "pantry": string[] }`
Response: `{ "code": string }` containing TS code defining `const recipes = [...]`.
