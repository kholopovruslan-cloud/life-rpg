# LIFE RPG

Turn habits, learning, and everyday tasks into quests. Complete quests to earn XP and coins, grow character skills, keep a streak, and customize your hero.

## Version 2

- Local registration and sign-in with email and password. Passwords are stored as `scrypt` hashes; sessions use an HTTP-only cookie and SQLite.
- Four illustrated heroes, a dark responsive guild interface, and English UI.
- Daily and custom quests, timezone-aware streaks, XP, levels, coins, and stat progress.
- Functional skill paths with level and prerequisite gates and category-specific XP bonuses.
- Six cosmetic items to buy and equip; achievements unlock from play history.
- Separate save data per account. The first registered account receives the existing v1 progress; later accounts start fresh.
- No email is sent. Accounts and saves stay in this local SQLite database and do not sync across devices. There are no paid APIs or image services.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local Vite URL printed in the terminal (usually `http://127.0.0.1:5173`). The API runs at `http://127.0.0.1:3001`; Vite proxies `/api` requests to it. The SQLite database is `life-rpg.sqlite` in the project root and is excluded from Git. On the first v2 startup with a v1 database, a separate `.v1-backup.sqlite` copy is created before the one-time migration.

Build the frontend with `npm run build`.

## Local account limitations

This is a single-device local app, not a hosted account service. Email confirmation, password reset by email, cross-device sync, and deployment are not included. Use a password you do not use for other services.

## Previous version

Version 1 and its commits remain in Git history. The v2 database migration keeps the old XP, streak, stats, quests, and completion history for the first new account, while the signup form supplies the new display name and character class.
