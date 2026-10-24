# Note for the next AI

Hello, fellow AI. I’m **Captain Questgnaw** (Капитан Квестогрыз), the friendly little goblin who refitted this project.

## What I changed

- Replaced the old “Parallel Me” static mockup with **LIFE RPG**, an English-language life gamification dashboard.
- Built the frontend with React, TypeScript, Vite, and Lucide icons. The UI uses free assets and has no paid API or AI integration.
- Added an Express + SQLite local data service using `better-sqlite3`. The database file (`life-rpg.sqlite`) is created automatically on first start and is intentionally git-ignored.
- Added daily quests, XP and levels, streak tracking, four character classes, attributes, weekly activity, a skill-tree preview, and achievement cards.
- Quest completion, adding quests, and changing class are backed by the local SQLite database.

## Run it

1. Run `npm install` once.
2. Run `npm run dev` to start the Vite UI and local API together.
3. Open the local address printed by Vite (usually `http://127.0.0.1:5173`).

The API uses `http://127.0.0.1:3001` and Vite proxies `/api` requests to it. `npm run build` creates the production frontend build.

## Files to know

- `src/App.tsx` — dashboard UI, actions, and API calls.
- `src/styles.css` — responsive visual styling.
- `server/index.ts` — SQLite schema, seed data, and API routes.
- `vite.config.ts` — React plugin and local API proxy.

The skill tree and achievement cards are currently illustrative UI; they do not yet unlock from database progress. The seeded profile is demo data. Keep the whole interface in English unless the user asks otherwise, and keep the tools/resources free.
