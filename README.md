# LIFE RPG

Turn habits, learning, and everyday tasks into quests. Complete quests to earn XP, build streaks, grow character attributes, and explore your next skill.

## Version 1

- English-language responsive dashboard built with React and TypeScript.
- Character classes, levels, XP, daily quests, streaks, and attribute progress.
- Local SQLite persistence for the profile, quests, and quest completions.
- Weekly activity overview, skill-tree preview, and achievement cards.
- Add quests, complete daily quests, and change character class.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local Vite URL printed in the terminal (usually `http://127.0.0.1:5173`). The app starts a local API at `http://127.0.0.1:3001`; Vite proxies `/api` requests to it. SQLite data is stored in `life-rpg.sqlite` in the project root and is excluded from Git.

Build the frontend with `npm run build`.

## Notes

This is a local-first prototype. The skill tree and achievement cards are illustrative in version 1; they do not yet unlock dynamically. No paid APIs or AI services are used.
