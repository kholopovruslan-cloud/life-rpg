import express, { type NextFunction, type Request, type Response } from 'express'
import Database from 'better-sqlite3'
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scrypt = promisify(scryptCallback)
const here = dirname(fileURLToPath(import.meta.url))
const databasePath = resolve(process.env.LIFE_RPG_DB ?? resolve(here, '../life-rpg.sqlite'))
const port = Number(process.env.PORT ?? 3001)
const SESSION_COOKIE = 'life_rpg_session'
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000
const classes = ['The Scholar', 'The Adventurer', 'The Creator', 'The Socialite'] as const
const categories = ['Mind', 'Body', 'Focus', 'Social'] as const
type Category = typeof categories[number]
type EquipmentSlot = 'headwear' | 'outfit' | 'accessory'
type ShopItem = { id:string; name:string; slot:EquipmentSlot; rarity:'Common'|'Rare'; price:number; description:string; accent:string }
type HeroDefinition = { id:string; name:string; characterClass:typeof classes[number]; category:Category; look:'violet'|'green'|'orange'|'blue'; tagline:string; description:string; xpBonus:number; price:number|null; rarity:'Starter'|'Epic' }

const heroDefinitions:HeroDefinition[] = [
  {id:'mira',name:'Mira',characterClass:'The Scholar',category:'Mind',look:'violet',tagline:'Curious mind',description:'Finds wonder in every new idea.',xpBonus:5,price:null,rarity:'Starter'},
  {id:'kai',name:'Kai',characterClass:'The Adventurer',category:'Body',look:'green',tagline:'Trailblazer',description:'Turns small steps into bold journeys.',xpBonus:5,price:null,rarity:'Starter'},
  {id:'sol',name:'Sol',characterClass:'The Creator',category:'Focus',look:'orange',tagline:'Idea maker',description:'Makes something meaningful from a blank page.',xpBonus:5,price:null,rarity:'Starter'},
  {id:'noor',name:'Noor',characterClass:'The Socialite',category:'Social',look:'blue',tagline:'Community builder',description:'Grows stronger through connection.',xpBonus:5,price:null,rarity:'Starter'},
  {id:'aster',name:'Aster',characterClass:'The Scholar',category:'Mind',look:'violet',tagline:'Starweaver',description:'Maps bright ideas into constellations.',xpBonus:5,price:150,rarity:'Epic'},
  {id:'rowan',name:'Rowan',characterClass:'The Adventurer',category:'Body',look:'green',tagline:'Trailwarden',description:'Keeps a steady pace through every season.',xpBonus:5,price:150,rarity:'Epic'},
  {id:'ember',name:'Ember',characterClass:'The Creator',category:'Focus',look:'orange',tagline:'Forgeheart',description:'Shapes patient effort into something real.',xpBonus:5,price:150,rarity:'Epic'},
  {id:'lyra',name:'Lyra',characterClass:'The Socialite',category:'Social',look:'blue',tagline:'Wayfinder',description:'Brings people together around a shared path.',xpBonus:5,price:150,rarity:'Epic'},
]

const shopItems:ShopItem[] = [
  { id:'leaf-circlet', name:'Wayfinder Circlet', slot:'headwear', rarity:'Common', price:30, description:'A small reminder to keep moving forward.', accent:'#94ad76' },
  { id:'starlit-hood', name:'Starlit Hood', slot:'headwear', rarity:'Rare', price:50, description:'Sewn beneath a sky full of possibility.', accent:'#9d87ca' },
  { id:'trail-cloak', name:'Trailkeeper Cloak', slot:'outfit', rarity:'Common', price:30, description:'Made for the long road and little detours.', accent:'#789a74' },
  { id:'dawn-mantle', name:'Dawnweave Mantle', slot:'outfit', rarity:'Rare', price:50, description:'A warm glow for the next chapter.', accent:'#dfa46e' },
  { id:'moon-charm', name:'Moonlit Charm', slot:'accessory', rarity:'Common', price:30, description:'Carry a little calm into the day.', accent:'#93a8cf' },
  { id:'sun-compass', name:'Sun Compass', slot:'accessory', rarity:'Rare', price:50, description:'Find your way by what matters most.', accent:'#e5bd6d' },
]

const skillTree = [
  { id:'mind-spark', name:'Curious Spark', category:'Mind' as Category, tier:1, minLevel:2, cost:1, xpBonus:5, requires:null, description:'+5 XP from Mind quests.' },
  { id:'mind-flow', name:'Deep Focus', category:'Mind' as Category, tier:2, minLevel:5, cost:1, xpBonus:10, requires:'mind-spark', description:'+10 XP from Mind quests.' },
  { id:'body-spark', name:'Moving Start', category:'Body' as Category, tier:1, minLevel:2, cost:1, xpBonus:5, requires:null, description:'+5 XP from Body quests.' },
  { id:'body-flow', name:'Easy Momentum', category:'Body' as Category, tier:2, minLevel:5, cost:1, xpBonus:10, requires:'body-spark', description:'+10 XP from Body quests.' },
  { id:'focus-spark', name:'Quiet Hour', category:'Focus' as Category, tier:1, minLevel:2, cost:1, xpBonus:5, requires:null, description:'+5 XP from Focus quests.' },
  { id:'focus-flow', name:'Steady Rhythm', category:'Focus' as Category, tier:2, minLevel:5, cost:1, xpBonus:10, requires:'focus-spark', description:'+10 XP from Focus quests.' },
  { id:'social-spark', name:'Open Door', category:'Social' as Category, tier:1, minLevel:2, cost:1, xpBonus:5, requires:null, description:'+5 XP from Social quests.' },
  { id:'social-flow', name:'Shared Energy', category:'Social' as Category, tier:2, minLevel:5, cost:1, xpBonus:10, requires:'social-spark', description:'+10 XP from Social quests.' },
]

type ProfileRow = { userId:string; displayName:string; characterClass:string; heroId:string; xp:number; coins:number; streak:number; lastActive:string|null; timeZone:string; skillPoints:number }

function tableExists(db:Database.Database, name:string){ return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)) }
function validTimeZone(value:unknown):string {
  if (typeof value !== 'string' || value.length > 64) return 'UTC'
  try { new Intl.DateTimeFormat('en-US',{timeZone:value}); return value } catch { return 'UTC' }
}
function localDate(timeZone:string, date=new Date()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const part=(type:string)=>parts.find(p=>p.type===type)?.value??'00'
  return `${part('year')}-${part('month')}-${part('day')}`
}
function daysBefore(day:string, amount:number):string {
  const date=new Date(`${day}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate()-amount); return date.toISOString().slice(0,10)
}
function hashToken(token:string){ return createHash('sha256').update(token).digest('hex') }
function cookieToken(request:Request):string|null {
  const pair=request.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${SESSION_COOKIE}=`))
  return pair ? pair.slice(SESSION_COOKIE.length+1) : null
}
function setSessionCookie(response:Response, token:string){ response.cookie(SESSION_COOKIE,token,{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:SESSION_TTL}) }
async function hashPassword(password:string,salt=randomBytes(16).toString('hex')){
  const derived=await scrypt(password,salt,64) as Buffer
  return {salt,hash:derived.toString('hex')}
}
async function passwordMatches(password:string,salt:string,expected:string){
  const actual=await hashPassword(password,salt)
  const left=Buffer.from(actual.hash,'hex'), right=Buffer.from(expected,'hex')
  return left.length===right.length && timingSafeEqual(left,right)
}
function issueSession(db:Database.Database,userId:string,response:Response){
  const token=randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(hashToken(token),userId,Date.now()+SESSION_TTL,Date.now())
  setSessionCookie(response,token)
}

function createSchema(db:Database.Database){
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL, character_class TEXT NOT NULL, hero_id TEXT NOT NULL DEFAULT 'mira', xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, last_active TEXT,
      time_zone TEXT NOT NULL DEFAULT 'UTC', skill_points INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stats (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(user_id,name)
    );
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, category TEXT NOT NULL, xp INTEGER NOT NULL, stat TEXT NOT NULL,
      done_on TEXT, created_at INTEGER NOT NULL, campaign_id TEXT, step_order INTEGER,
      campaign_completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS quests_user_idx ON quests(user_id);
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT 'The First Trail',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id TEXT NOT NULL, completed_on TEXT NOT NULL, xp_awarded INTEGER NOT NULL, coins_awarded INTEGER NOT NULL DEFAULT 10
    );
    CREATE INDEX IF NOT EXISTS completions_user_day_idx ON completions(user_id,completed_on);
    CREATE TABLE IF NOT EXISTS unlocked_skills (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, skill_id TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL, PRIMARY KEY(user_id,skill_id)
    );
    CREATE TABLE IF NOT EXISTS skill_definitions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, tier INTEGER NOT NULL,
      min_level INTEGER NOT NULL, cost INTEGER NOT NULL, xp_bonus INTEGER NOT NULL,
      requires TEXT, description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hero_definitions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, character_class TEXT NOT NULL, category TEXT NOT NULL,
      look TEXT NOT NULL, tagline TEXT NOT NULL, description TEXT NOT NULL,
      xp_bonus INTEGER NOT NULL, price INTEGER, rarity TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS owned_heroes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hero_id TEXT NOT NULL REFERENCES hero_definitions(id), purchased_at INTEGER NOT NULL,
      PRIMARY KEY(user_id,hero_id)
    );
    CREATE TABLE IF NOT EXISTS inventory (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL,
      purchased_at INTEGER NOT NULL, PRIMARY KEY(user_id,item_id)
    );
    CREATE TABLE IF NOT EXISTS equipment (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, slot TEXT NOT NULL,
      item_id TEXT NOT NULL, PRIMARY KEY(user_id,slot)
    );
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
}

function seedHeroDefinitions(db:Database.Database){
  const insert=db.prepare(`INSERT OR IGNORE INTO hero_definitions(id,name,character_class,category,look,tagline,description,xp_bonus,price,rarity) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  for(const hero of heroDefinitions) insert.run(hero.id,hero.name,hero.characterClass,hero.category,hero.look,hero.tagline,hero.description,hero.xpBonus,hero.price,hero.rarity)
}
function starterHeroForClass(characterClass:string){return heroDefinitions.find(hero=>hero.characterClass===characterClass&&hero.price===null)??heroDefinitions[0]}
function grantStarterHeroes(db:Database.Database,userId:string){
  const insert=db.prepare('INSERT OR IGNORE INTO owned_heroes(user_id,hero_id,purchased_at) VALUES (?,?,?)')
  for(const hero of heroDefinitions.filter(item=>item.price===null)) insert.run(userId,hero.id,0)
}

async function initializeDatabase(db:Database.Database){
  db.pragma('foreign_keys = ON')
  const version=(db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version
  if(version>=4){ createSchema(db); seedHeroDefinitions(db); return }
  if(version===3){
    const backupPath=`${db.name}.v3-backup.sqlite`
    const {existsSync}=await import('node:fs')
    if(!existsSync(backupPath)) await db.backup(backupPath)
    migrateCampaignSchema(db)
    seedHeroDefinitions(db)
    return
  }
  if(version===2){
    const migrate=db.transaction(()=>{
      createSchema(db)
      db.exec("ALTER TABLE profiles ADD COLUMN hero_id TEXT NOT NULL DEFAULT 'mira'")
      seedHeroDefinitions(db)
      const profiles=db.prepare('SELECT user_id AS userId,character_class AS characterClass FROM profiles').all() as {userId:string;characterClass:string}[]
      const update=db.prepare('UPDATE profiles SET hero_id=? WHERE user_id=?')
      for(const profile of profiles){
        const hero=starterHeroForClass(profile.characterClass)
        update.run(hero.id,profile.userId)
        grantStarterHeroes(db,profile.userId)
      }
      db.pragma('user_version = 3')
    })
    migrate()
    const backupPath=`${db.name}.v3-backup.sqlite`
    const {existsSync}=await import('node:fs')
    if(!existsSync(backupPath)) await db.backup(backupPath)
    migrateCampaignSchema(db)
    return
  }

  const hasLegacyProfile=tableExists(db,'profile')
  if(hasLegacyProfile){
    const backupPath=`${db.name}.v1-backup.sqlite`
    const {existsSync}=await import('node:fs')
    if(!existsSync(backupPath)) await db.backup(backupPath)
  }
  const legacyTables=['profile','stats','quests','completions'].filter(name=>tableExists(db,name))
  const migrate=db.transaction(()=>{
    for(const name of legacyTables) db.exec(`ALTER TABLE ${name} RENAME TO legacy_${name}`)
    createSchema(db)
    seedHeroDefinitions(db)
    db.prepare('INSERT OR REPLACE INTO app_meta(key,value) VALUES (?,?)').run('legacy_save',hasLegacyProfile?'available':'claimed')
    db.pragma('user_version = 3')
  })
  migrate()
  migrateCampaignSchema(db)
}

function migrateCampaignSchema(db:Database.Database){
  const columns=new Set((db.prepare('PRAGMA table_info(quests)').all() as {name:string}[]).map(column=>column.name))
  const migrate=db.transaction(()=>{
    createSchema(db)
    if(!columns.has('campaign_id')) db.exec('ALTER TABLE quests ADD COLUMN campaign_id TEXT')
    if(!columns.has('step_order')) db.exec('ALTER TABLE quests ADD COLUMN step_order INTEGER')
    if(!columns.has('campaign_completed_at')) db.exec('ALTER TABLE quests ADD COLUMN campaign_completed_at TEXT')
    db.exec('CREATE INDEX IF NOT EXISTS quests_campaign_idx ON quests(user_id,campaign_id,step_order)')
    db.pragma('user_version = 4')
  })
  migrate()
}

function seedStats(db:Database.Database,userId:string){
  const addStat=db.prepare('INSERT INTO stats(user_id,name,value) VALUES (?,?,1)')
  for(const stat of categories) addStat.run(userId,stat)
}
function seedQuests(db:Database.Database,userId:string){
  const addQuest=db.prepare('INSERT INTO quests(id,user_id,title,category,xp,stat,done_on,created_at) VALUES (?,?,?,?,?,?,NULL,?)')
  const starter=[['Read 10 pages','Mind',25,'Mind'],['Move your body for 20 min','Body',30,'Body'],['Focus on one task for 25 min','Focus',35,'Focus'],['Drink a glass of water','Body',15,'Body']] as const
  for(const [title,categoryName,xp,stat] of starter) addQuest.run(randomUUID(),userId,title,categoryName,xp,stat,Date.now())
}
function seedFreshProfile(db:Database.Database,userId:string,displayName:string,characterClass:string,heroId:string,timeZone:string){
  db.prepare('INSERT INTO profiles(user_id,display_name,character_class,hero_id,xp,coins,streak,last_active,time_zone,skill_points) VALUES (?,?,?,?,0,0,0,NULL,?,0)')
    .run(userId,displayName,characterClass,heroId,timeZone)
  grantStarterHeroes(db,userId)
  seedStats(db,userId);seedQuests(db,userId)
}

function createApp(db:Database.Database){
  const app=express()
  app.use(express.json({limit:'32kb'}))

  const requireAuth=(request:Request,response:Response,next:NextFunction)=>{
    const token=cookieToken(request)
    if(!token){response.status(401).json({error:'Sign in to continue.'});return}
    const session=db.prepare(`SELECT s.user_id AS userId FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(hashToken(token),Date.now()) as {userId:string}|undefined
    if(!session){response.clearCookie(SESSION_COOKIE,{httpOnly:true,sameSite:'strict',secure:false,path:'/'});response.status(401).json({error:'Your session has expired. Sign in again.'});return}
    request.userId=session.userId
    const supplied=request.get('X-Time-Zone')
    if(supplied){
      const zone=validTimeZone(supplied)
      db.prepare('UPDATE profiles SET time_zone=? WHERE user_id=?').run(zone,session.userId)
    }
    next()
  }

  app.post('/api/auth/register',async(request,response)=>{
    const email=typeof request.body.email==='string'?request.body.email.trim().toLowerCase():''
    const password=typeof request.body.password==='string'?request.body.password:''
    const displayName=typeof request.body.displayName==='string'?request.body.displayName.trim():''
    const characterClass=String(request.body.characterClass??'')
    const timeZone=validTimeZone(request.body.timeZone)
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({error:'Enter a valid email address.'})
    if(password.length<8||password.length>128) return response.status(400).json({error:'Use a password between 8 and 128 characters.'})
    if(displayName.length<2||displayName.length>24) return response.status(400).json({error:'Choose a name between 2 and 24 characters.'})
    if(!classes.includes(characterClass as typeof classes[number])) return response.status(400).json({error:'Choose a character to continue.'})
    const starterHero=starterHeroForClass(characterClass)
    const credentials=await hashPassword(password)
    const userId=randomUUID()
    try{
      const createUser=db.transaction(()=>{
        db.prepare('INSERT INTO users(id,email,password_salt,password_hash,created_at) VALUES (?,?,?,?,?)').run(userId,email,credentials.salt,credentials.hash,Date.now())
        const claim=db.prepare("SELECT value FROM app_meta WHERE key='legacy_save'").get() as {value:string}|undefined
        const legacyProfile=claim?.value==='available'&&tableExists(db,'legacy_profile')
          ? db.prepare('SELECT * FROM legacy_profile ORDER BY id LIMIT 1').get() as {name:string;xp:number;streak:number;last_active:string|null}|undefined
          : undefined
        if(legacyProfile){
          const skillPoints=Math.floor(legacyProfile.xp/250)
          db.prepare('INSERT INTO profiles(user_id,display_name,character_class,hero_id,xp,coins,streak,last_active,time_zone,skill_points) VALUES (?,?,?,?,?,0,?,?,?,?)')
            .run(userId,displayName,characterClass,starterHero.id,legacyProfile.xp,legacyProfile.streak,legacyProfile.last_active,timeZone,skillPoints)
          grantStarterHeroes(db,userId)
          if(tableExists(db,'legacy_stats')){
            const oldStats=db.prepare('SELECT name,value FROM legacy_stats').all() as {name:string;value:number}[]
            for(const stat of categories){const old=oldStats.find(item=>item.name===stat);db.prepare('INSERT INTO stats(user_id,name,value) VALUES (?,?,?)').run(userId,stat,old?.value??1)}
          }else seedStats(db,userId)
          if(tableExists(db,'legacy_quests')){
            const oldQuests=db.prepare('SELECT id,title,category,xp,stat,done_on AS doneOn FROM legacy_quests').all() as {id:string;title:string;category:string;xp:number;stat:string;doneOn:string|null}[]
            const insert=db.prepare('INSERT INTO quests(id,user_id,title,category,xp,stat,done_on,created_at) VALUES (?,?,?,?,?,?,?,?)')
            for(const quest of oldQuests) insert.run(quest.id,userId,quest.title,quest.category,quest.xp,quest.stat,quest.doneOn,Date.now())
          }else seedQuests(db,userId)
          if(tableExists(db,'legacy_completions')){
            const oldCompletions=db.prepare('SELECT id,quest_id AS questId,completed_on AS completedOn,xp FROM legacy_completions').all() as {id:number;questId:string;completedOn:string;xp:number}[]
            const insert=db.prepare('INSERT INTO completions(id,user_id,quest_id,completed_on,xp_awarded,coins_awarded) VALUES (?,?,?,?,?,0)')
            for(const completion of oldCompletions) insert.run(completion.id,userId,completion.questId,completion.completedOn,completion.xp)
          }
          db.prepare("UPDATE app_meta SET value='claimed' WHERE key='legacy_save'").run()
        }else{
          seedFreshProfile(db,userId,displayName,characterClass,starterHero.id,timeZone)
          if(claim?.value==='available') db.prepare("UPDATE app_meta SET value='claimed' WHERE key='legacy_save'").run()
        }
      })
      createUser()
    }catch(error){
      if(error instanceof Error&&error.message.includes('UNIQUE constraint failed: users.email')) return response.status(409).json({error:'An account with this email already exists.'})
      throw error
    }
    issueSession(db,userId,response)
    response.status(201).json({user:{id:userId,email},profile:profileFor(db,userId)})
  })

  app.post('/api/auth/login',async(request,response)=>{
    const email=typeof request.body.email==='string'?request.body.email.trim().toLowerCase():''
    const password=typeof request.body.password==='string'?request.body.password:''
    const user=db.prepare('SELECT id,email,password_salt AS salt,password_hash AS passwordHash FROM users WHERE email=?').get(email) as {id:string;email:string;salt:string;passwordHash:string}|undefined
    if(!user||!await passwordMatches(password,user.salt,user.passwordHash)) return response.status(401).json({error:'Email or password is incorrect.'})
    const timeZone=validTimeZone(request.body.timeZone)
    db.prepare('UPDATE profiles SET time_zone=? WHERE user_id=?').run(timeZone,user.id)
    issueSession(db,user.id,response)
    response.json({user:{id:user.id,email:user.email},profile:profileFor(db,user.id)})
  })

  app.post('/api/auth/logout',(request,response)=>{
    const token=cookieToken(request)
    if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token))
    response.clearCookie(SESSION_COOKIE,{httpOnly:true,sameSite:'strict',secure:false,path:'/'})
    response.json({ok:true})
  })

  app.get('/api/auth/me',requireAuth,(request,response)=>{
    const user=db.prepare('SELECT id,email FROM users WHERE id=?').get(request.userId) as {id:string;email:string}
    response.json({user,profile:profileFor(db,request.userId!)})
  })

  app.post('/api/auth/password',requireAuth,async(request,response)=>{
    const currentPassword=typeof request.body.currentPassword==='string'?request.body.currentPassword:''
    const newPassword=typeof request.body.newPassword==='string'?request.body.newPassword:''
    if(newPassword.length<8||newPassword.length>128) return response.status(400).json({error:'Use a password between 8 and 128 characters.'})
    const user=db.prepare('SELECT password_salt AS salt,password_hash AS passwordHash FROM users WHERE id=?').get(request.userId) as {salt:string;passwordHash:string}
    if(!await passwordMatches(currentPassword,user.salt,user.passwordHash)) return response.status(401).json({error:'Current password is incorrect.'})
    const credentials=await hashPassword(newPassword)
    const token=randomBytes(32).toString('base64url')
    const update=db.transaction(()=>{
      db.prepare('UPDATE users SET password_salt=?,password_hash=? WHERE id=?').run(credentials.salt,credentials.hash,request.userId)
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(request.userId)
      db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(hashToken(token),request.userId,Date.now()+SESSION_TTL,Date.now())
    })
    update();setSessionCookie(response,token);response.json({ok:true})
  })

  app.get('/api/state',requireAuth,(request,response)=>{
    const userId=request.userId!
    const profile=profileFor(db,userId)
    const today=localDate(profile.timeZone)
    const quests=db.prepare('SELECT id,title,category,xp,stat,done_on AS doneOn FROM quests WHERE user_id=? AND campaign_id IS NULL ORDER BY created_at,rowid').all(userId)
    const campaigns=(db.prepare('SELECT id,title,description,region,created_at AS createdAt FROM campaigns WHERE user_id=? ORDER BY created_at DESC').all(userId) as {id:string;title:string;description:string;region:string;createdAt:number}[]).map(campaign=>{
      const steps=db.prepare(`SELECT id,title,category,xp,step_order AS orderIndex,campaign_completed_at AS completedAt FROM quests WHERE user_id=? AND campaign_id=? ORDER BY step_order`).all(userId,campaign.id) as {id:string;title:string;category:Category;xp:number;orderIndex:number;completedAt:string|null}[]
      return {...campaign,steps:steps.map(step=>({...step,completed:Boolean(step.completedAt)})),completedSteps:steps.filter(step=>step.completedAt).length,totalSteps:steps.length}
    })
    const stats=Object.fromEntries((db.prepare('SELECT name,value FROM stats WHERE user_id=?').all(userId) as {name:string;value:number}[]).map(item=>[item.name,item.value]))
    const weekStart=daysBefore(today,6)
    const week=db.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(xp_awarded),0) AS xp FROM completions WHERE user_id=? AND completed_on>=?').get(userId,weekStart)
    const weekDays=db.prepare('SELECT completed_on AS day,COUNT(*) AS count,COALESCE(SUM(xp_awarded),0) AS xp FROM completions WHERE user_id=? AND completed_on>=? GROUP BY completed_on').all(userId,weekStart)
    const unlocked=new Set((db.prepare('SELECT skill_id FROM unlocked_skills WHERE user_id=?').all(userId) as {skill_id:string}[]).map(row=>row.skill_id))
    const level=Math.floor(profile.xp/250)+1
    const skills=skillTree.map(skill=>({...skill,unlocked:unlocked.has(skill.id),canUnlock:!unlocked.has(skill.id)&&profile.skillPoints>=skill.cost&&level>=skill.minLevel&&(!skill.requires||unlocked.has(skill.requires))}))
    const inventory=(db.prepare('SELECT item_id AS itemId FROM inventory WHERE user_id=?').all(userId) as {itemId:string}[]).map(row=>row.itemId)
    const ownedHeroes=new Set((db.prepare('SELECT hero_id FROM owned_heroes WHERE user_id=?').all(userId) as {hero_id:string}[]).map(row=>row.hero_id))
    const heroes=heroDefinitions.map(hero=>({...hero,className:hero.characterClass,owned:ownedHeroes.has(hero.id),active:hero.id===profile.heroId}))
    const equipment=Object.fromEntries((db.prepare('SELECT slot,item_id AS itemId FROM equipment WHERE user_id=?').all(userId) as {slot:EquipmentSlot;itemId:string}[]).map(row=>[row.slot,row.itemId])) as Partial<Record<EquipmentSlot,string>>
    const completions=db.prepare('SELECT COUNT(*) AS count FROM completions WHERE user_id=?').get(userId) as {count:number}
    const completedDays=(db.prepare('SELECT DISTINCT completed_on AS day FROM completions WHERE user_id=? ORDER BY completed_on').all(userId) as {day:string}[]).map(row=>row.day)
    const categoryCounts=Object.fromEntries((db.prepare(`SELECT q.category AS category,COUNT(*) AS count FROM completions c JOIN quests q ON q.id=c.quest_id AND q.user_id=c.user_id WHERE c.user_id=? GROUP BY q.category`).all(userId) as {category:Category;count:number}[]).map(row=>[row.category,row.count])) as Partial<Record<Category,number>>
    const unlockedAchievementIds=deriveAchievements(completions.count,level,unlocked.size,equipment,completedDays,categoryCounts,ownedHeroes.size)
    const achievements=achievementDefinitions.map(item=>{const progress=achievementProgress(item.id,completions.count,level,unlocked.size,equipment,completedDays,categoryCounts,ownedHeroes.size);return {...item,progress,target:achievementTargets[item.id],unlocked:unlockedAchievementIds.has(item.id)}})
    response.json({profile,quests,campaigns,stats,week,weekDays,today,skills,shopItems,inventory,equipment,heroes,achievements})
  })

  app.post('/api/campaigns',requireAuth,(request,response)=>{
    const title=typeof request.body.title==='string'?request.body.title.trim().slice(0,60):''
    const description=typeof request.body.description==='string'?request.body.description.trim().slice(0,240):''
    const region=typeof request.body.region==='string'?request.body.region.trim().slice(0,40):'The First Trail'
    const rawSteps:unknown[]=Array.isArray(request.body.steps)?request.body.steps:[]
    const steps:{title:string;category:Category}[]=rawSteps.map((step:unknown)=>{
      const value=step as {title?:unknown;category?:unknown}
      return {title:typeof value?.title==='string'?value.title.trim().slice(0,80):'',category:String(value?.category??'') as Category}
    })
    if(title.length<3) return response.status(400).json({error:'Give your campaign a title of at least 3 characters.'})
    if(steps.length<2||steps.length>8) return response.status(400).json({error:'A campaign needs between 2 and 8 milestones.'})
    if(steps.some(step=>step.title.length<2||!categories.includes(step.category as Category))) return response.status(400).json({error:'Every milestone needs a title and a valid quest path.'})
    const id=randomUUID(),userId=request.userId!,createdAt=Date.now()
    const create=db.transaction(()=>{
      db.prepare('INSERT INTO campaigns(id,user_id,title,description,region,created_at) VALUES (?,?,?,?,?,?)').run(id,userId,title,description,region,createdAt)
      const insert=db.prepare('INSERT INTO quests(id,user_id,title,category,xp,stat,done_on,created_at,campaign_id,step_order) VALUES (?,?,?,?,30,?,NULL,?,?,?)')
      for(const [index,step] of steps.entries()) insert.run(randomUUID(),userId,step.title,step.category,step.category,createdAt+index,id,index)
    })
    create()
    response.status(201).json({id,title,description,region,totalSteps:steps.length})
  })

  app.patch('/api/campaigns/:campaignId/steps/:stepId/complete',requireAuth,(request,response)=>{
    const userId=request.userId!,campaignId=String(request.params.campaignId),stepId=String(request.params.stepId)
    const step=db.prepare('SELECT id,title,category,xp,stat,step_order AS stepOrder,campaign_completed_at AS completedAt FROM quests WHERE id=? AND user_id=? AND campaign_id=?').get(stepId,userId,campaignId) as {id:string;title:string;category:Category;xp:number;stat:Category;stepOrder:number;completedAt:string|null}|undefined
    if(!step) return response.status(404).json({error:'Campaign milestone not found.'})
    if(step.completedAt) return response.status(409).json({error:'This milestone is already complete.'})
    if(db.prepare('SELECT 1 FROM quests WHERE user_id=? AND campaign_id=? AND step_order<? AND campaign_completed_at IS NULL').get(userId,campaignId,step.stepOrder)) return response.status(409).json({error:'Complete the earlier milestone first.'})
    const profile=profileFor(db,userId),today=localDate(profile.timeZone)
    const skillBonus=db.prepare('SELECT COALESCE(SUM(s.xp_bonus),0) AS bonus FROM unlocked_skills u JOIN skill_definitions s ON s.id=u.skill_id WHERE u.user_id=? AND s.category=?').get(userId,step.category) as {bonus:number}
    const hero=heroDefinitions.find(item=>item.id===profile.heroId)
    const xpAwarded=step.xp+skillBonus.bonus+(hero?.category===step.category?hero.xpBonus:0)
    const coinsAwarded=10,currentLevel=Math.floor(profile.xp/250)+1,nextXP=profile.xp+xpAwarded,nextLevel=Math.floor(nextXP/250)+1
    const skillPoints=profile.skillPoints+Math.max(0,nextLevel-currentLevel)
    const streak=profile.lastActive===today?profile.streak:profile.lastActive===daysBefore(today,1)?profile.streak+1:1
    const complete=db.transaction(()=>{
      const updated=db.prepare('UPDATE quests SET done_on=?,campaign_completed_at=? WHERE id=? AND user_id=? AND campaign_id=? AND campaign_completed_at IS NULL').run(today,today,stepId,userId,campaignId)
      if(updated.changes!==1) throw new Error('CAMPAIGN_STEP_ALREADY_DONE')
      db.prepare('INSERT INTO completions(user_id,quest_id,completed_on,xp_awarded,coins_awarded) VALUES (?,?,?,?,?)').run(userId,stepId,today,xpAwarded,coinsAwarded)
      db.prepare('UPDATE profiles SET xp=?,coins=coins+?,skill_points=?,streak=?,last_active=? WHERE user_id=?').run(nextXP,coinsAwarded,skillPoints,streak,today,userId)
      db.prepare('UPDATE stats SET value=value+1 WHERE user_id=? AND name=?').run(userId,step.stat)
    })
    try{complete()}catch(error){if(error instanceof Error&&error.message==='CAMPAIGN_STEP_ALREADY_DONE')return response.status(409).json({error:'This milestone is already complete.'});throw error}
    response.json({ok:true,xpAwarded,coinsAwarded,leveledUp:nextLevel>currentLevel,level:nextLevel,skillPoints})
  })

  app.patch('/api/profile/class',requireAuth,(request,response)=>{
    const characterClass=String(request.body.characterClass??request.body.class??'')
    if(!classes.includes(characterClass as typeof classes[number])) return response.status(400).json({error:'Choose a valid character.'})
    const hero=starterHeroForClass(characterClass)
    db.prepare('UPDATE profiles SET character_class=?,hero_id=? WHERE user_id=?').run(characterClass,hero.id,request.userId)
    response.json({profile:profileFor(db,request.userId!)})
  })

  app.post('/api/heroes/:id/purchase',requireAuth,(request,response)=>{
    const hero=heroDefinitions.find(item=>item.id===request.params.id)
    if(!hero||hero.price===null) return response.status(404).json({error:'Unlockable hero not found.'})
    const userId=request.userId!
    if(db.prepare('SELECT 1 FROM owned_heroes WHERE user_id=? AND hero_id=?').get(userId,hero.id)) return response.status(409).json({error:'You already own this hero.'})
    const purchase=db.transaction(()=>{
      const debit=db.prepare('UPDATE profiles SET coins=coins-? WHERE user_id=? AND coins>=?').run(hero.price,userId,hero.price)
      if(debit.changes!==1) throw new Error('NOT_ENOUGH_COINS')
      db.prepare('INSERT INTO owned_heroes(user_id,hero_id,purchased_at) VALUES (?,?,?)').run(userId,hero.id,Date.now())
    })
    try{purchase()}catch(error){if(error instanceof Error&&error.message==='NOT_ENOUGH_COINS')return response.status(400).json({error:'You need more coins to recruit this hero.'});throw error}
    response.status(201).json({ok:true,heroId:hero.id,profile:profileFor(db,userId)})
  })

  app.put('/api/profile/hero',requireAuth,(request,response)=>{
    const hero=heroDefinitions.find(item=>item.id===String(request.body.heroId??''))
    if(!hero) return response.status(400).json({error:'Choose a valid hero.'})
    if(!db.prepare('SELECT 1 FROM owned_heroes WHERE user_id=? AND hero_id=?').get(request.userId,hero.id)) return response.status(403).json({error:'Unlock this hero before choosing them.'})
    const change=db.transaction(()=>db.prepare('UPDATE profiles SET hero_id=?,character_class=? WHERE user_id=?').run(hero.id,hero.characterClass,request.userId))
    change()
    response.json({ok:true,profile:profileFor(db,request.userId!)})
  })

  app.post('/api/quests',requireAuth,(request,response)=>{
    const title=typeof request.body.title==='string'?request.body.title.trim().slice(0,80):''
    const category=request.body.category as Category
    if(!title) return response.status(400).json({error:'Quest title is required.'})
    if(!categories.includes(category)) return response.status(400).json({error:'Choose a quest category.'})
    const id=randomUUID()
    db.prepare('INSERT INTO quests(id,user_id,title,category,xp,stat,created_at) VALUES (?,?,?,?,25,?,?)').run(id,request.userId,title,category,category,Date.now())
    response.status(201).json({id,title,category,xp:25,stat:category,doneOn:null})
  })

  app.patch('/api/quests/:id/complete',requireAuth,(request,response)=>{
    const userId=request.userId!
    const profile=profileFor(db,userId)
    const today=localDate(profile.timeZone)
    const quest=db.prepare('SELECT id,title,category,xp,stat,done_on AS doneOn,campaign_id AS campaignId FROM quests WHERE id=? AND user_id=?').get(request.params.id,userId) as {id:string;title:string;category:Category;xp:number;stat:Category;doneOn:string|null;campaignId:string|null}|undefined
    if(!quest) return response.status(404).json({error:'Quest not found.'})
    if(quest.campaignId) return response.status(400).json({error:'Complete campaign milestones from the campaign map.'})
    if(quest.doneOn===today) return response.status(409).json({error:'Quest already completed today.'})
    const skillBonus=db.prepare(`SELECT COALESCE(SUM(s.xp_bonus),0) AS bonus FROM unlocked_skills u JOIN skill_definitions s ON s.id=u.skill_id WHERE u.user_id=? AND s.category=?`).get(userId,quest.category) as {bonus:number}
    const hero=heroDefinitions.find(item=>item.id===profile.heroId)
    const heroBonus=hero?.category===quest.category?hero.xpBonus:0
    const xpAwarded=quest.xp+skillBonus.bonus+heroBonus
    const coinsAwarded=10
    const currentLevel=Math.floor(profile.xp/250)+1
    const nextXP=profile.xp+xpAwarded
    const nextLevel=Math.floor(nextXP/250)+1
    const newSkillPoints=profile.skillPoints+Math.max(0,nextLevel-currentLevel)
    const streak=profile.lastActive===today?profile.streak:profile.lastActive===daysBefore(today,1)?profile.streak+1:1
    const complete=db.transaction(()=>{
      const result=db.prepare('UPDATE quests SET done_on=? WHERE id=? AND user_id=? AND (done_on IS NULL OR done_on<>?)').run(today,quest.id,userId,today)
      if(result.changes!==1) throw new Error('QUEST_ALREADY_DONE')
      db.prepare('INSERT INTO completions(user_id,quest_id,completed_on,xp_awarded,coins_awarded) VALUES (?,?,?,?,?)').run(userId,quest.id,today,xpAwarded,coinsAwarded)
      db.prepare('UPDATE profiles SET xp=?,coins=coins+?,skill_points=?,streak=?,last_active=? WHERE user_id=?').run(nextXP,coinsAwarded,newSkillPoints,streak,today,userId)
      db.prepare('UPDATE stats SET value=value+1 WHERE user_id=? AND name=?').run(userId,quest.stat)
    })
    try{complete()}catch(error){if(error instanceof Error&&error.message==='QUEST_ALREADY_DONE')return response.status(409).json({error:'Quest already completed today.'});throw error}
    response.json({ok:true,xpAwarded,coinsAwarded,leveledUp:nextLevel>currentLevel,level:nextLevel,skillPoints:newSkillPoints})
  })

  app.post('/api/skills/:id/unlock',requireAuth,(request,response)=>{
    const userId=request.userId!
    const skill=skillTree.find(item=>item.id===request.params.id)
    if(!skill) return response.status(404).json({error:'Skill not found.'})
    const profile=profileFor(db,userId)
    const level=Math.floor(profile.xp/250)+1
    const existing=db.prepare('SELECT 1 FROM unlocked_skills WHERE user_id=? AND skill_id=?').get(userId,skill.id)
    if(existing) return response.status(409).json({error:'Skill is already unlocked.'})
    if(level<skill.minLevel) return response.status(400).json({error:`Reach level ${skill.minLevel} to unlock this skill.`})
    if(profile.skillPoints<skill.cost) return response.status(400).json({error:'You need another skill point.'})
    if(skill.requires&&!db.prepare('SELECT 1 FROM unlocked_skills WHERE user_id=? AND skill_id=?').get(userId,skill.requires)) return response.status(400).json({error:'Unlock the previous skill in this path first.'})
    const unlock=db.transaction(()=>{
      db.prepare('UPDATE profiles SET skill_points=skill_points-? WHERE user_id=?').run(skill.cost,userId)
      db.prepare('INSERT INTO unlocked_skills(user_id,skill_id,unlocked_at) VALUES (?,?,?)').run(userId,skill.id,Date.now())
    })
    unlock();response.json({ok:true,skill:skill.id,profile:profileFor(db,userId)})
  })

  app.post('/api/shop/:itemId/purchase',requireAuth,(request,response)=>{
    const userId=request.userId!
    const item=shopItems.find(entry=>entry.id===request.params.itemId)
    if(!item) return response.status(404).json({error:'Item not found.'})
    if(db.prepare('SELECT 1 FROM inventory WHERE user_id=? AND item_id=?').get(userId,item.id)) return response.status(409).json({error:'You already own this item.'})
    const profile=profileFor(db,userId)
    if(profile.coins<item.price) return response.status(400).json({error:'Not enough coins for this item.'})
    const purchase=db.transaction(()=>{
      const result=db.prepare('UPDATE profiles SET coins=coins-? WHERE user_id=? AND coins>=?').run(item.price,userId,item.price)
      if(result.changes!==1) throw new Error('NOT_ENOUGH_COINS')
      db.prepare('INSERT INTO inventory(user_id,item_id,purchased_at) VALUES (?,?,?)').run(userId,item.id,Date.now())
    })
    try{purchase()}catch(error){if(error instanceof Error&&error.message==='NOT_ENOUGH_COINS')return response.status(400).json({error:'Not enough coins for this item.'});throw error}
    response.status(201).json({ok:true,item:item.id,profile:profileFor(db,userId)})
  })

  app.put('/api/equipment/:slot',requireAuth,(request,response)=>{
    const userId=request.userId!
    const slot=request.params.slot as EquipmentSlot
    if(!['headwear','outfit','accessory'].includes(slot)) return response.status(400).json({error:'Choose a valid equipment slot.'})
    const itemId=request.body.itemId===null?null:String(request.body.itemId??'')
    if(itemId){
      const item=shopItems.find(entry=>entry.id===itemId&&entry.slot===slot)
      if(!item||!db.prepare('SELECT 1 FROM inventory WHERE user_id=? AND item_id=?').get(userId,itemId)) return response.status(400).json({error:'That item is not in your inventory for this slot.'})
      db.prepare('INSERT INTO equipment(user_id,slot,item_id) VALUES (?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=excluded.item_id').run(userId,slot,itemId)
    }else db.prepare('DELETE FROM equipment WHERE user_id=? AND slot=?').run(userId,slot)
    response.json({ok:true,equipment:db.prepare('SELECT slot,item_id AS itemId FROM equipment WHERE user_id=?').all(userId)})
  })

  app.use((error:unknown,_request:Request,response:Response,_next:NextFunction)=>{
    console.error(error)
    response.status(500).json({error:'Something went wrong. Please try again.'})
  })
  return app
}

function profileFor(db:Database.Database,userId:string):ProfileRow{
  return db.prepare(`SELECT user_id AS userId,display_name AS displayName,character_class AS characterClass,hero_id AS heroId,xp,coins,streak,last_active AS lastActive,time_zone AS timeZone,skill_points AS skillPoints FROM profiles WHERE user_id=?`).get(userId) as ProfileRow
}

const achievementDefinitions=[
  {id:'first-step',name:'First Steps',description:'Complete your first quest.',icon:'footprints',rarity:'Common'},
  {id:'three-day-streak',name:'On a Roll',description:'Complete quests on three consecutive days.',icon:'flame',rarity:'Rare'},
  {id:'quest-collector',name:'Quest Collector',description:'Complete 25 quests.',icon:'trophy',rarity:'Epic'},
  {id:'skill-seeker',name:'Skill Seeker',description:'Unlock three skills.',icon:'sparkles',rarity:'Rare'},
  {id:'well-equipped',name:'Ready for Anything',description:'Equip an item in all three slots.',icon:'shield',rarity:'Rare'},
  {id:'level-five',name:'Rising Hero',description:'Reach level 5.',icon:'award',rarity:'Epic'},
  {id:'mindful-learner',name:'Mindful Learner',description:'Complete 10 Mind quests.',icon:'book-open',rarity:'Common'},
  {id:'body-in-motion',name:'Body in Motion',description:'Complete 10 Body quests.',icon:'heart',rarity:'Common'},
  {id:'focus-keeper',name:'Focus Keeper',description:'Complete 10 Focus quests.',icon:'target',rarity:'Common'},
  {id:'kindred-spirit',name:'Kindred Spirit',description:'Complete 10 Social quests.',icon:'users',rarity:'Common'},
  {id:'guild-regular',name:'A Week of Wonder',description:'Complete quests on seven consecutive days.',icon:'flame',rarity:'Legendary'},
  {id:'hero-collector',name:'The Whole Party',description:'Recruit all eight heroes.',icon:'crown',rarity:'Legendary'},
]
const achievementTargets:Record<string,number>={'first-step':1,'three-day-streak':3,'quest-collector':25,'skill-seeker':3,'well-equipped':3,'level-five':5,'mindful-learner':10,'body-in-motion':10,'focus-keeper':10,'kindred-spirit':10,'guild-regular':7,'hero-collector':8}
function longestRun(days:string[]){
  let best=0,current=0,previous=''
  for(const day of days){current=previous&&day===daysBefore(previous,-1)?current+1:1;best=Math.max(best,current);previous=day}
  return best
}
function achievementProgress(id:string,count:number,level:number,skills:number,equipment:Partial<Record<EquipmentSlot,string>>,days:string[],categoryCounts:Partial<Record<Category,number>>,ownedHeroes:number){
  const streak=longestRun(days)
  const values:Record<string,number>={'first-step':count,'three-day-streak':streak,'quest-collector':count,'skill-seeker':skills,'well-equipped':Object.keys(equipment).length,'level-five':level,'mindful-learner':categoryCounts.Mind??0,'body-in-motion':categoryCounts.Body??0,'focus-keeper':categoryCounts.Focus??0,'kindred-spirit':categoryCounts.Social??0,'guild-regular':streak,'hero-collector':ownedHeroes}
  return Math.min(values[id]??0,achievementTargets[id]??0)
}
function deriveAchievements(count:number,level:number,skills:number,equipment:Partial<Record<EquipmentSlot,string>>,days:string[],categoryCounts:Partial<Record<Category,number>>,ownedHeroes:number){
  return new Set(achievementDefinitions.filter(item=>achievementProgress(item.id,count,level,skills,equipment,days,categoryCounts,ownedHeroes)>=achievementTargets[item.id]).map(item=>item.id))
}

declare global { namespace Express { interface Request { userId?:string } } }

async function start(){
  const db=new Database(databasePath)
  db.pragma('journal_mode = WAL')
  await initializeDatabase(db)
  for(const skill of skillTree) db.prepare(`INSERT OR IGNORE INTO skill_definitions(id,name,category,tier,min_level,cost,xp_bonus,requires,description) VALUES (?,?,?,?,?,?,?,?,?)`).run(skill.id,skill.name,skill.category,skill.tier,skill.minLevel,skill.cost,skill.xpBonus,skill.requires,skill.description)
  const app=createApp(db)
  app.listen(port,'127.0.0.1',()=>console.log(`Life RPG v2 API ready at http://127.0.0.1:${port}`))
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  start().catch(error=>{console.error(error);process.exitCode=1})
}
