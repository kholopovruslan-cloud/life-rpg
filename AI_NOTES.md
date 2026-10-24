# Note for the next AI

Hello, fellow AI. I’m **Captain Questgnaw** (Капитан Квестогрыз), the friendly goblin who brought LIFE RPG through versions 2.1 and 2.2.

## What is here

- LIFE RPG v2.1 is an English-language React + TypeScript interface with an Express API and local SQLite storage.
- Local account registration, sign-in, sign-out, password changes, `scrypt` password hashes, hashed database session tokens, and HTTP-only session cookies are implemented. No mail is sent; password recovery by email is not available.
- Data is scoped to the signed-in user. First registration imports the v1 save after a database backup; later accounts start with fresh profiles and quests.
- Quests award XP and 10 coins. Every 250 XP grants a level and skill point. Skill branches enforce level/prerequisite gates and grant category XP bonuses.
- The armory has six cosmetic items with purchase and equipment checks. Twelve rarity-ranked achievements expose progress and goals.
- Eight heroes share equal role bonuses: Mira/Aster (Mind), Kai/Rowan (Body), Sol/Ember (Focus), and Noor/Lyra (Social). Four starter heroes are free; four alternate appearances cost 150 earned game coins. No real-money checkout exists.
- Original SVG portraits are project assets. There are no paid API, AI, or image dependencies.

## Run it

1. Run `npm install` once.
2. Run `npm run dev` to start Vite and the SQLite API together.
3. Open the local Vite address (usually `http://127.0.0.1:5173`).

The API defaults to `http://127.0.0.1:3001`; Vite proxies `/api`. The local DB is `life-rpg.sqlite` and is ignored by Git. For a v1 DB, the first v2 startup creates a `.v1-backup.sqlite` copy before applying the transactional schema migration. The first registered user claims the migrated save.

## Important files

- `src/App.tsx` — sign-in, guild UI, quests, skills, armory, and achievements.
- `src/styles.css` — responsive dark RPG styling.
- `server/index.ts` — auth/session handling, user-scoped SQLite schema, migrations, and game API. Schema v3 adds hero ownership and assigns existing profiles a starter matching their role.
- `vite.config.ts` — React plugin and local API proxy.

## Git history

- Public repository: https://github.com/kholopovruslan-cloud/life-rpg
- Version 1 commit: `644f969` — `Version 1: LIFE RPG dashboard, quests, and SQLite progress tracking`.
- Version 1.1 commit: `72e748f` — `Version 1.1: Add a diverse character roster and themed portraits`.
- Version 2 commit: `f7fb396` — `Version 2: Local accounts, skills, and guild RPG interface`.
- Versions 2.1 and 2.2 are saved as separate release commits after v2.0; their hashes and exact messages will be recorded here after publishing. A small final docs commit records the v2.2 hash. Keep earlier history intact.

## Constraints

Keep the interface in English unless asked otherwise. Accounts are local to this device; do not imply cloud sync. Keep images and services free. This version deliberately has no combat or punishments for missed real-life tasks.
