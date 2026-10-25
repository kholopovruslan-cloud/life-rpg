# Note for the next AI

Hello, fellow AI. I’m **Captain Questgnaw** (Капитан Квестогрыз), the friendly goblin who helped bring LIFE RPG to version 3.0.

## What is here

- LIFE RPG v3.0 is an English-language React + TypeScript interface with an Express API and local SQLite storage.
- Local account registration, sign-in, sign-out, password changes, `scrypt` password hashes, hashed database session tokens, and HTTP-only session cookies are implemented. No mail is sent; password recovery by email is not available.
- Data is scoped to the signed-in user. First registration imports the v1 save after a database backup; later accounts start with fresh profiles and quests.
- Quests award XP and 10 coins. Every 250 XP grants a level and skill point. Skill branches enforce level/prerequisite gates and grant category XP bonuses.
- The armory has six cosmetic items with purchase and equipment checks. Twelve rarity-ranked achievements expose progress and goals.
- Eight heroes share equal role bonuses: Mira/Aster (Mind), Kai/Rowan (Body), Sol/Ember (Focus), and Noor/Lyra (Social). Four starter heroes are free; four alternate appearances cost 150 earned game coins. No real-money checkout exists.
- Original SVG portraits are project assets. There are no paid API, AI, or image dependencies.
- The 2.2 guild topbar containing `LOCAL SAVE` and the account menu stays fixed on desktop and mobile; mobile navigation occupies its own fixed row above it.
- The v2.2.1 `/api/state` hero records include `className` for the UI as well as the database-oriented `characterClass`; keep both fields in sync when changing the hero payload.
- Version 3.0 adds Campaign Atlas: each account can create goal campaigns with 2–8 ordered milestones. Milestones are stored as user-owned quest rows, hidden from the daily quest board, and completed once in sequence from the campaign map.
- Campaign milestone completion uses the standard level, XP, coin, streak, stat, role-bonus, and skill-bonus rules. Campaign progress has no deadline or decay. API routes are user-scoped and reject skipped or repeated steps.
- Schema v4 adds `campaigns` and campaign metadata columns to `quests`; existing schema-v3 databases are backed up to `life-rpg.sqlite.v3-backup.sqlite` before migration.

## Run it

1. Run `npm install` once.
2. Run `npm run dev` to start Vite and the SQLite API together.
3. Open the local Vite address (usually `http://127.0.0.1:5173`).

The API defaults to `http://127.0.0.1:3001`; Vite proxies `/api`. The local DB is `life-rpg.sqlite` and is ignored by Git. For a v1 DB, the first v2 startup creates a `.v1-backup.sqlite` copy before applying the transactional schema migration. The first registered user claims the migrated save.

## Important files

- `src/App.tsx` — sign-in, guild UI, quests, skills, armory, and achievements.
- `src/styles.css` — responsive dark RPG styling.
- `server/index.ts` — auth/session handling, user-scoped SQLite schema, v1–v4 migrations, and game/campaign APIs. Schema v3 adds hero ownership; schema v4 adds Campaign Atlas.
- `vite.config.ts` — React plugin and local API proxy.

## Git history

- Public repository: https://github.com/kholopovruslan-cloud/life-rpg
- Version 1 commit: `644f969` — `Version 1: LIFE RPG dashboard, quests, and SQLite progress tracking`.
- Version 1.1 commit: `72e748f` — `Version 1.1: Add a diverse character roster and themed portraits`.
- Version 2 commit: `f7fb396` — `Version 2: Local accounts, skills, and guild RPG interface`.
- Version 2.1 commit: `cd5777e` — `Version 2.1: Character roles, unlockable heroes, and achievements`.
- Version 2.2 commit: `9d13cc3` — `Version 2.2: Pin the guild header while scrolling`.
- Version 2.2.1 commit: `af73f43` — `Fix: Map hero roles for the guild dashboard`.
- Version 3.0 commit: `da37d27` — `Version 3.0: Add Campaign Atlas milestone journeys`.
- The release sequence is v1 `644f969`, v1.1 `72e748f`, v2.0 `f7fb396`, v2.1 `cd5777e`, v2.2 `9d13cc3`, and v2.2.1 `af73f43`. This hash is recorded in the follow-up docs commit; keep earlier history intact.

## Version 3.0 review status

- `npm run build` passes after the Campaign Atlas changes.
- Isolated SQLite/API smoke check passes for v3→v4 migration, registration on a migrated database, campaign creation, daily-board separation, ordered milestone completion, replay/skip guards, reward calculation, and account isolation. Test data used a separate temporary database and did not alter the user's save.
- The user's local database is now schema v4; its pre-migration `.v3-backup.sqlite` copy was created. No campaign data was added to the user's profile during review.
- The user reviewed the local v3.0 build and authorized a local commit. Do not push to GitHub unless they explicitly ask.
- Current feature scope is personal campaigns with 2–8 ordered milestone quests, campaign map UI, one-time sequential completion, regular XP/coin/streak/stat/skill/hero rewards, and no deadlines or decay.
- The SQLite v3→v4 migration backs up to `.v3-backup.sqlite` before applying schema changes. Existing profiles and daily quests stay intact.
- The v3→v4 startup path also seeds hero definitions, so a schema-v3 database without prior hero rows can register its first account safely.

## Constraints

Keep the interface in English unless asked otherwise. Accounts are local to this device; do not imply cloud sync. Keep images and services free. The current build deliberately has no combat or punishments for missed real-life tasks.
