# LIFE RPG

Turn habits, learning, and everyday tasks into quests. Complete quests to earn XP and coins, grow character skills, keep a streak, and customize your hero.

## Version 2.2

- Local registration and sign-in with email and password. Passwords are stored as `scrypt` hashes; sessions use an HTTP-only cookie and SQLite.
- Eight original illustrated heroes across four specializations: Mira (Mind), Kai (Body), Sol (Focus), and Noor (Social), each with a +5 XP role bonus. Four alternate heroes can be recruited for 150 earned coins each; all share their role's bonus.
- Daily and custom quests, timezone-aware streaks, XP, levels, coins, and stat progress.
- Functional skill paths with level and prerequisite gates and category-specific XP bonuses.
- Six cosmetic items to buy and equip; twelve rarity-ranked achievements show live progress.
- Separate save data per account. The first registered account receives the existing v1 progress; later accounts start fresh.
- No email is sent. Accounts and saves stay in this local SQLite database and do not sync across devices. There are no paid APIs or image services.
- The guild header with the local-save status and account menu stays fixed while you scroll. On phones, the navigation and header use separate reserved rows.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local Vite URL printed in the terminal (usually `http://127.0.0.1:5173`). The API runs at `http://127.0.0.1:3001`; Vite proxies `/api` requests to it. The SQLite database is `life-rpg.sqlite` in the project root and is excluded from Git. On the first v2 startup with a v1 database, a separate `.v1-backup.sqlite` copy is created before the one-time migration.

Version 2.1 transactionally migrates v2 profiles to the hero collection schema and keeps existing XP, streaks, quests, and completion history.

Build the frontend with `npm run build`.

## Local account limitations

This is a single-device local app, not a hosted account service. Email confirmation, password reset by email, cross-device sync, and deployment are not included. Use a password you do not use for other services.

## Previous version

Version 1 and its commits remain in Git history. The v2 database migration keeps the old XP, streak, stats, quests, and completion history for the first new account, while the signup form supplies the new display name and character class.
