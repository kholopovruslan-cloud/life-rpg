import express from 'express'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const db = new Database(resolve(here, '../life-rpg.sqlite'))
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, class TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, last_active TEXT);
  CREATE TABLE IF NOT EXISTS stats (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS quests (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, xp INTEGER NOT NULL, stat TEXT NOT NULL, done_on TEXT);
  CREATE TABLE IF NOT EXISTS completions (id INTEGER PRIMARY KEY AUTOINCREMENT, quest_id TEXT NOT NULL, completed_on TEXT NOT NULL, xp INTEGER NOT NULL);
`)
const today = () => new Date().toISOString().slice(0, 10)
const profile = db.prepare('SELECT id FROM profile WHERE id=1').get()
if (!profile) {
  db.prepare('INSERT INTO profile (id,name,class,xp,streak,last_active) VALUES (1,?,?,?,?,?)').run('Alex Morgan', 'The Scholar', 1240, 4, today())
  const addStat = db.prepare('INSERT INTO stats(name,value) VALUES (?,?)')
  for (const [name, value] of [['Mind', 7], ['Body', 4], ['Focus', 6], ['Social', 3]]) addStat.run(name, value)
  const addQuest = db.prepare('INSERT INTO quests(id,title,category,xp,stat) VALUES (?,?,?,?,?)')
  const samples = [
    ['Read 10 pages', 'Mind', 25, 'Mind'], ['Move your body for 20 min', 'Body', 30, 'Body'],
    ['Focus on one task for 25 min', 'Focus', 35, 'Focus'], ['Drink a glass of water', 'Body', 15, 'Body'],
  ]
  for (const [title, category, xp, stat] of samples) addQuest.run(randomUUID(), title, category, xp, stat)
}
const app = express()
app.use(express.json())
app.get('/api/state', (_req, res) => {
  const p = db.prepare('SELECT name,class,xp,streak FROM profile WHERE id=1').get() as {name:string;class:string;xp:number;streak:number}
  const quests = db.prepare('SELECT id,title,category,xp,stat,done_on AS doneOn FROM quests ORDER BY rowid').all()
  const stats = Object.fromEntries((db.prepare('SELECT name,value FROM stats').all() as {name:string;value:number}[]).map((s) => [s.name,s.value]))
  const recent = db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(xp),0) AS xp FROM completions WHERE completed_on >= date(?, '-6 days')`).get(today())
  const weekDays = db.prepare(`SELECT completed_on AS day, COUNT(*) AS count, COALESCE(SUM(xp),0) AS xp FROM completions WHERE completed_on >= date(?, '-6 days') GROUP BY completed_on`).all(today())
  res.json({ profile:p, quests, stats, week:recent, weekDays, today:today() })
})
app.patch('/api/profile/class', (req, res) => {
  const characterClass = String(req.body.class ?? '')
  if (!['The Scholar','The Adventurer','The Creator','The Socialite'].includes(characterClass)) return res.status(400).json({ error:'Choose a valid class.' })
  db.prepare('UPDATE profile SET class=? WHERE id=1').run(characterClass)
  res.json({ class:characterClass })
})
app.post('/api/quests', (req, res) => {
  const title = String(req.body.title ?? '').trim().slice(0, 80)
  const category = String(req.body.category ?? 'Focus')
  const stat = ['Mind','Body','Focus','Social'].includes(category) ? category : 'Focus'
  if (!title) return res.status(400).json({ error:'Quest title is required.' })
  const id = randomUUID()
  db.prepare('INSERT INTO quests(id,title,category,xp,stat) VALUES (?,?,?,?,?)').run(id,title,stat,25,stat)
  res.status(201).json({ id,title,category:stat,xp:25,stat,doneOn:null })
})
app.patch('/api/quests/:id/complete', (req, res) => {
  const quest = db.prepare('SELECT id,xp,stat,done_on AS doneOn FROM quests WHERE id=?').get(req.params.id) as {id:string;xp:number;stat:string;doneOn:string|null}|undefined
  if (!quest) return res.status(404).json({ error:'Quest not found.' })
  const date = today()
  if (quest.doneOn === date) return res.status(409).json({ error:'Quest already completed today.' })
  const commit = db.transaction(() => {
    db.prepare('UPDATE quests SET done_on=? WHERE id=?').run(date,quest.id)
    db.prepare('INSERT INTO completions(quest_id,completed_on,xp) VALUES (?,?,?)').run(quest.id,date,quest.xp)
    db.prepare(`UPDATE profile SET xp=xp+?, streak=CASE WHEN last_active=? THEN streak WHEN last_active=date(?, '-1 day') THEN streak+1 ELSE 1 END,last_active=? WHERE id=1`).run(quest.xp,date,date,date)
    db.prepare('UPDATE stats SET value=value+1 WHERE name=?').run(quest.stat)
  })
  commit()
  res.json({ ok:true, xp:quest.xp })
})
app.listen(3001, '127.0.0.1', () => console.log('Life RPG data server ready at http://127.0.0.1:3001'))
