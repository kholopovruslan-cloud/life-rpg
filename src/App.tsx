import { useEffect, useState, type FormEvent } from 'react'
import {
  Activity, ArrowRight, Award, Backpack, BadgeCheck, BookOpen, Check, ChevronRight,
  CircleHelp, Coins, Compass, Crown, DoorOpen, Flame, Footprints, Gem, Heart, KeyRound,
  LockKeyhole, LogOut, Moon, Plus, Shield, Sparkles, Star, Swords, Target,
  Trophy, UserRound, Users, WandSparkles, Zap,
} from 'lucide-react'

type StatName='Mind'|'Body'|'Focus'|'Social'
type CharacterLook='violet'|'green'|'orange'|'blue'
type EquipmentSlot='headwear'|'outfit'|'accessory'
type Character={name:string;className:string;look:CharacterLook;tagline:string;description:string}
type Quest={id:string;title:string;category:StatName;xp:number;stat:StatName;doneOn:string|null}
type Skill={id:string;name:string;category:StatName;tier:number;minLevel:number;cost:number;xpBonus:number;requires:string|null;description:string;unlocked:boolean;canUnlock:boolean}
type ShopItem={id:string;name:string;slot:EquipmentSlot;rarity:'Common'|'Rare';price:number;description:string;accent:string}
type GameState={profile:{userId:string;displayName:string;characterClass:string;xp:number;coins:number;streak:number;lastActive:string|null;timeZone:string;skillPoints:number};quests:Quest[];stats:Record<StatName,number>;week:{count:number;xp:number};weekDays:{day:string;count:number;xp:number}[];today:string;skills:Skill[];shopItems:ShopItem[];inventory:string[];equipment:Partial<Record<EquipmentSlot,string>>;achievements:{id:string;name:string;description:string;icon:string;unlocked:boolean}[]}
type User={id:string;email:string}
type ApiError=Error&{status?:number}

const characters:Character[]=[
  {name:'Mira',className:'The Scholar',look:'violet',tagline:'Curious mind',description:'Finds wonder in every new idea.'},
  {name:'Kai',className:'The Adventurer',look:'green',tagline:'Trailblazer',description:'Turns small steps into bold journeys.'},
  {name:'Sol',className:'The Creator',look:'orange',tagline:'Idea maker',description:'Makes something meaningful from a blank page.'},
  {name:'Noor',className:'The Socialite',look:'blue',tagline:'Community builder',description:'Grows stronger through connection.'},
]
const categories:StatName[]=['Mind','Body','Focus','Social']
const slots:EquipmentSlot[]=['headwear','outfit','accessory']
const statIcons={Mind:BookOpen,Body:Heart,Focus:Target,Social:Users}
const classIcons={'The Scholar':BookOpen,'The Adventurer':Compass,'The Creator':WandSparkles,'The Socialite':Users}
const achievementIcons:Record<string,typeof Award>={'footprints':Footprints,'flame':Flame,'trophy':Trophy,'sparkles':Sparkles,'shield':Shield,'award':Award}
const slotNames:Record<EquipmentSlot,string>={headwear:'Headwear',outfit:'Outfit',accessory:'Accessory'}

function browserTimeZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}
async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers)
  headers.set('X-Time-Zone',browserTimeZone())
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json')
  const response=await fetch(path,{...init,headers,credentials:'same-origin'})
  const payload=await response.json().catch(()=>({error:'The server returned an unreadable response.'})) as {error?:string}
  if(!response.ok){const error=new Error(payload.error??'Something went wrong.') as ApiError;error.status=response.status;throw error}
  return payload as T
}

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [data,setData]=useState<GameState|null>(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [loading,setLoading]=useState(false)
  const [authMode,setAuthMode]=useState<'login'|'register'>('register')
  const [tab,setTab]=useState('Guild Hall')
  const [error,setError]=useState('')
  const [toast,setToast]=useState('')
  const [busy,setBusy]=useState<string|null>(null)
  const [questOpen,setQuestOpen]=useState(false)
  const [questTitle,setQuestTitle]=useState('')
  const [questCategory,setQuestCategory]=useState<StatName>('Focus')
  const [accountOpen,setAccountOpen]=useState(false)
  const [passwordOpen,setPasswordOpen]=useState(false)
  const [passwordFields,setPasswordFields]=useState({currentPassword:'',newPassword:''})
  const [showPassword,setShowPassword]=useState(false)

  const refresh=async()=>{setLoading(true);try{const next=await api<GameState>('/api/state');setData(next)}catch(e){const issue=e as ApiError;if(issue.status===401){setUser(null);setData(null)}else setError(issue.message)}finally{setLoading(false)}}
  useEffect(()=>{api<{user:User}>('/api/auth/me').then(result=>setUser(result.user)).catch(issue=>{if((issue as ApiError).status!==401)setError((issue as Error).message)}).finally(()=>setAuthLoading(false))},[])
  useEffect(()=>{if(user)void refresh();else setData(null)},[user?.id])

  const character=characters.find(entry=>entry.className===data?.profile.characterClass)??characters[0]
  const level=Math.floor((data?.profile.xp??0)/250)+1
  const xpInLevel=(data?.profile.xp??0)%250
  const xpPercent=xpInLevel/250*100
  const completedCount=data?.quests.filter(quest=>quest.doneOn===data.today).length??0

  function announce(message:string){setToast(message);window.setTimeout(()=>setToast(''),2800)}
  async function signIn(result:User){setUser(result);setError('');setAuthMode('login')}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'})}finally{setData(null);setUser(null);setAccountOpen(false);setTab('Guild Hall')}}
  async function completeQuest(quest:Quest){
    if(!data||quest.doneOn===data.today)return
    setBusy(quest.id);setError('')
    try{const reward=await api<{xpAwarded:number;coinsAwarded:number;leveledUp:boolean;level:number}>('/api/quests/'+quest.id+'/complete',{method:'PATCH'});await refresh();announce(`Quest complete · +${reward.xpAwarded} XP · +${reward.coinsAwarded} coins${reward.leveledUp?` · Level ${reward.level}!`:''}`)}catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }
  async function addQuest(event:FormEvent){
    event.preventDefault();if(!questTitle.trim())return
    try{await api('/api/quests',{method:'POST',body:JSON.stringify({title:questTitle,category:questCategory})});setQuestTitle('');setQuestOpen(false);await refresh();announce('New quest added to your board.')}catch(e){setError((e as Error).message)}
  }
  async function chooseCharacter(className:string){
    try{await api('/api/profile/class',{method:'PATCH',body:JSON.stringify({characterClass:className})});await refresh();announce('Your character has changed.')}catch(e){setError((e as Error).message)}
  }
  async function unlockSkill(skill:Skill){
    setBusy(skill.id);try{await api(`/api/skills/${skill.id}/unlock`,{method:'POST'});await refresh();announce(`${skill.name} unlocked!`)}catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }
  async function buyItem(item:ShopItem){
    setBusy(item.id);try{await api(`/api/shop/${item.id}/purchase`,{method:'POST'});await refresh();announce(`${item.name} added to your pack.`)}catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }
  async function equipItem(slot:EquipmentSlot,itemId:string|null){
    setBusy(slot);try{await api(`/api/equipment/${slot}`,{method:'PUT',body:JSON.stringify({itemId})});await refresh();announce(itemId?'Gear equipped.':'Gear removed.')}catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }
  async function changePassword(event:FormEvent){
    event.preventDefault();try{await api('/api/auth/password',{method:'POST',body:JSON.stringify(passwordFields)});setPasswordFields({currentPassword:'',newPassword:''});setPasswordOpen(false);announce('Password changed.')}catch(e){setError((e as Error).message)}
  }

  if(authLoading)return <main className="loading-screen"><div className="loading-rune"><Sparkles/></div><p>Opening the guild hall…</p></main>
  if(!user)return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={signIn} showPassword={showPassword} setShowPassword={setShowPassword} error={error} setError={setError}/>

  return <div className="game-shell">
    <aside className="guild-sidebar">
      <a className="game-brand" href="#guild"><span className="brand-sigil"><Swords size={19}/></span><span>LIFE <b>RPG</b><small>YOUR PERSONAL ADVENTURE</small></span></a>
      <div className="nav-caption">THE GUILD</div>
      <nav className="game-nav" aria-label="Main navigation">{[['Guild Hall',DoorOpen],['Quest Board',Target],['Skill Tree',Sparkles],['Armory',Backpack],['Achievements',Trophy]].map(([label,Icon])=><button key={label as string} className={tab===label?'selected':''} onClick={()=>{setTab(label as string);setError('')}}><Icon size={17}/><span>{label as string}</span>{tab===label&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="daily-quote"><div className="quote-flourish">✦</div><p>“Great journeys<br/>begin with one<br/><em>small quest.</em>”</p><span>— GUILD WISDOM</span></div><div className="sidebar-player"><div className="player-portrait"><CharacterPortrait look={character.look} equipment={data?.equipment}/></div><div className="player-id"><strong>{data?.profile.displayName}</strong><span>LVL {level} · {character.className.replace('The ','')}</span></div><button className="sidebar-logout" title="Sign out" onClick={logout}><LogOut size={15}/></button></div></div>
    </aside>

    <main className="guild-main" id="guild">
      <header className="guild-topbar"><div className="breadcrumb"><span>CAMPAIGN</span><ChevronRight size={13}/><b>{tab.toUpperCase()}</b></div><div className="topbar-actions"><span className="local-save"><i/>LOCAL SAVE</span><div className="account-wrap"><button className="account-trigger" onClick={()=>setAccountOpen(!accountOpen)} aria-label="Account settings"><UserRound size={17}/><span>{user.email}</span></button>{accountOpen&&<div className="account-menu"><div className="account-email">SIGNED IN AS<br/><b>{user.email}</b></div><button onClick={()=>{setPasswordOpen(true);setAccountOpen(false)}}><KeyRound size={15}/>Change password</button><button onClick={()=>void logout()}><LogOut size={15}/>Sign out</button></div>}</div></div></header>
      <div className="content-wrap">
        {error&&<div className="game-alert" role="alert"><span><CircleHelp size={16}/>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss">×</button></div>}
        {loading&&!data?<div className="loading-panel"><Sparkles size={19}/> Loading your save…</div>:data&&<>
          {tab==='Guild Hall'&&<GuildHall data={data} character={character} level={level} xpPercent={xpPercent} xpInLevel={xpInLevel} completedCount={completedCount} setTab={setTab} chooseCharacter={chooseCharacter}/>}
          {tab==='Quest Board'&&<QuestBoard data={data} completedCount={completedCount} busy={busy} onComplete={completeQuest} questOpen={questOpen} setQuestOpen={setQuestOpen} questTitle={questTitle} setQuestTitle={setQuestTitle} questCategory={questCategory} setQuestCategory={setQuestCategory} onAdd={addQuest}/>}
          {tab==='Skill Tree'&&<SkillTree data={data} busy={busy} onUnlock={unlockSkill}/>}
          {tab==='Armory'&&<Armory data={data} character={character} busy={busy} onBuy={buyItem} onEquip={equipItem}/>}
          {tab==='Achievements'&&<Achievements data={data}/>}
        </>}
        <footer className="guild-footer"><span>✦ LIFE RPG</span><i/> PROGRESS OVER PERFECTION <span className="footer-version">LOCAL CAMPAIGN · V2</span></footer>
      </div>
    </main>
    {toast&&<div className="game-toast" role="status"><Sparkles size={16}/>{toast}</div>}
    {passwordOpen&&<div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setPasswordOpen(false)}}><form className="password-modal" onSubmit={changePassword}><button className="modal-x" type="button" onClick={()=>setPasswordOpen(false)} aria-label="Close">×</button><span className="modal-kicker">ACCOUNT SECURITY</span><h2>Change password</h2><label>Current password<input required type="password" autoComplete="current-password" value={passwordFields.currentPassword} onChange={e=>setPasswordFields({...passwordFields,currentPassword:e.target.value})}/></label><label>New password<input required minLength={8} type="password" autoComplete="new-password" value={passwordFields.newPassword} onChange={e=>setPasswordFields({...passwordFields,newPassword:e.target.value})}/></label><button className="gold-button" type="submit">Update password <ArrowRight size={16}/></button></form></div>}
  </div>
}

function AuthScreen({mode,setMode,onSuccess,showPassword,setShowPassword,error,setError}:{mode:'login'|'register';setMode:(mode:'login'|'register')=>void;onSuccess:(user:User)=>void;showPassword:boolean;setShowPassword:(value:boolean)=>void;error:string;setError:(value:string)=>void}){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [displayName,setDisplayName]=useState('');const [chosen,setChosen]=useState(characters[0].className);const [busy,setBusy]=useState(false)
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError('')
    try{
      const result=await api<{user:User}>(mode==='register'?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify({email,password,displayName,characterClass:chosen,timeZone:browserTimeZone()})})
      onSuccess(result.user)
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <div className="auth-screen">
    <div className="auth-left"><a className="game-brand auth-brand" href="#"><span className="brand-sigil"><Swords size={19}/></span><span>LIFE <b>RPG</b><small>YOUR PERSONAL ADVENTURE</small></span></a><div className="auth-content"><div className="auth-eyebrow"><span>✦</span> A NEW CHAPTER BEGINS</div><h1>{mode==='register'?'Build your':'Welcome back,'}<br/><em>{mode==='register'?'legend.':'adventurer.'}</em></h1><p className="auth-subtitle">{mode==='register'?'Create a local guild account and choose the hero who will walk beside you.':'Your quests are waiting. Step back into your story.'}</p>
      <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}} type="button">Sign in</button><button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}} type="button">Create account</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode==='register'&&<><label>ADVENTURER NAME<input required minLength={2} maxLength={24} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How should the guild call you?" autoComplete="nickname"/></label><fieldset className="class-chooser"><legend>CHOOSE YOUR HERO</legend><div>{characters.map(character=><button type="button" key={character.className} onClick={()=>setChosen(character.className)} className={chosen===character.className?'chosen':''} aria-label={`${character.name}, ${character.className}`}><CharacterPortrait look={character.look}/><span>{character.name}</span>{chosen===character.className&&<i><Check size={11}/></i>}</button>)}</div></fieldset></>}
        <label>EMAIL ADDRESS<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        <label>PASSWORD<span className="password-input"><input required minLength={8} maxLength={128} type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode==='register'?'new-password':'current-password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'HIDE':'SHOW'}</button></span></label>
        {error&&<div className="auth-error">{error}</div>}
        <button className="gold-button auth-submit" type="submit" disabled={busy}>{busy?'Opening the gates…':mode==='register'?'Create your character':'Enter the guild'}<ArrowRight size={16}/></button>
      </form><div className="offline-note"><LockKeyhole size={13}/> Local account · no email is sent · data stays on this device</div>
    </div><div className="auth-copyright">© YOUR ADVENTURE, YOUR RULES <span>·</span> SAVE LOCALLY</div></div>
    <div className="auth-right"><div className="auth-moon"/><div className="auth-orbit orbit-a"/><div className="auth-orbit orbit-b"/><div className="auth-stars"><i>✦</i><i>✧</i><i>✦</i><i>·</i></div><div className="auth-hero"><CharacterPortrait look={characters.find(c=>c.className===chosen)?.look??'violet'}/></div><div className="auth-right-copy"><span>THE WORLD IS WIDE OPEN</span><h2>Small quests.<br/><em>Epic becoming.</em></h2><p>Every ordinary day can be part of a bigger story.</p></div><div className="auth-runestone"><Sparkles size={16}/><span>LEVEL UP<br/><b>YOUR REAL LIFE</b></span></div></div>
  </div>
}

function PageHeading({kicker,title,subtitle,action}:{kicker:string;title:string;subtitle:string;action?:React.ReactNode}){return <div className="page-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}

function GuildHall({data,character,level,xpPercent,xpInLevel,completedCount,setTab,chooseCharacter}:{data:GameState;character:Character;level:number;xpPercent:number;xpInLevel:number;completedCount:number;setTab:(tab:string)=>void;chooseCharacter:(name:string)=>void}){
  const ClassIcon=classIcons[character.className as keyof typeof classIcons]
  return <>
    <div className="hall-title"><div><div className="section-kicker">THE GUILD HALL · {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase()}</div><h1>Welcome back, <em>{data.profile.displayName}.</em></h1><p>Your story is built one small victory at a time.</p></div><div className="coin-purse"><Coins size={17}/><b>{data.profile.coins}</b><span>COINS</span></div></div>
    <section className={`hero-banner look-${character.look}`}><div className="hero-copy"><div className="hero-class"><ClassIcon size={14}/>{character.className.toUpperCase()} <span>·</span> {character.tagline.toUpperCase()}</div><h2>{character.name}<br/><em>the {character.tagline.toLowerCase()}.</em></h2><p>{character.description}<br/>Your next chapter starts today.</p><div className="hero-level"><span>LEVEL <b>{level}</b></span><span>{xpInLevel} <i>/ 250 XP TO NEXT LEVEL</i></span></div><div className="hero-xp"><span style={{width:`${xpPercent}%`}}/></div><div className="hero-links"><button onClick={()=>setTab('Armory')}>Visit the armory <ArrowRight size={14}/></button><span>SKILL POINTS <b>{data.profile.skillPoints}</b></span></div></div><div className="hero-art"><div className="hero-halo"/><div className="hero-constellation">✦<i/>✧<i/>✦</div><div className="hero-character"><CharacterPortrait look={character.look} equipment={data.equipment}/></div><div className="hero-art-name">{character.name.toUpperCase()} · YOUR COMPANION</div></div><div className="hero-emblem"><Crown size={19}/><span>YOUR<br/>JOURNEY</span></div></section>
    <div className="overview-grid"><button className="overview-card quest-overview" onClick={()=>setTab('Quest Board')}><div className="overview-icon"><Target size={17}/></div><div><span>QUESTS TODAY</span><strong>{completedCount}<i> / {data.quests.length}</i></strong><small>Open your quest board <ArrowRight size={12}/></small></div><div className="mini-ring" style={{'--progress':`${data.quests.length?completedCount/data.quests.length*100:0}%`} as React.CSSProperties}><span>{data.quests.length?Math.round(completedCount/data.quests.length*100):0}<small>%</small></span></div></button><div className="overview-card streak-overview"><div className="overview-icon ember"><Flame size={17}/></div><div><span>ACTIVE STREAK</span><strong>{data.profile.streak}<i> DAYS</i></strong><small>Keep the flame alive</small></div><div className="ember-mark">♨</div></div><button className="overview-card skill-overview" onClick={()=>setTab('Skill Tree')}><div className="overview-icon lavender"><Sparkles size={17}/></div><div><span>SKILL POINTS</span><strong>{data.profile.skillPoints}<i> READY</i></strong><small>Choose what grows next <ArrowRight size={12}/></small></div><span className="overview-chevron"><ChevronRight size={17}/></span></button></div>
    <div className="hall-columns"><section className="dark-panel preview-panel"><div className="panel-title"><div><span className="panel-kicker">TODAY'S ADVENTURE</span><h2>Quest board</h2></div><button className="quiet-link" onClick={()=>setTab('Quest Board')}>VIEW ALL <ArrowRight size={13}/></button></div><div className="preview-quests">{data.quests.slice(0,3).map(quest=><QuestRow key={quest.id} quest={quest} today={data.today} compact/>)}</div><button className="gold-outline" onClick={()=>setTab('Quest Board')}>Open quest board <ArrowRight size={14}/></button></section><section className="dark-panel roster-panel"><div className="panel-title"><div><span className="panel-kicker">CHOOSE YOUR COMPANION</span><h2>Meet the party</h2></div><Users size={17}/></div><div className="party-list">{characters.map(item=><button key={item.className} className={item.className===character.className?'party-member current':'party-member'} onClick={()=>chooseCharacter(item.className)}><span className={`party-portrait ${item.look}`}><CharacterPortrait look={item.look}/></span><span><b>{item.name}</b><small>{item.tagline}</small></span>{item.className===character.className?<BadgeCheck size={16}/>:<ChevronRight size={15}/>}</button>)}</div></section></div>
    <GrowthJournal data={data}/>
    <section className="dark-panel hall-achievements"><div className="panel-title"><div><span className="panel-kicker">MILESTONES EARNED</span><h2>Proof of your progress</h2></div><button className="quiet-link" onClick={()=>setTab('Achievements')}>ALL ACHIEVEMENTS <ArrowRight size={13}/></button></div><div className="achievement-strip">{data.achievements.filter(item=>item.unlocked).slice(0,4).map(item=><div className="earned-seal" key={item.id}><span><Sparkles size={16}/></span><b>{item.name}</b><small>{item.description}</small></div>)}{!data.achievements.some(item=>item.unlocked)&&<p className="empty-note">Complete a quest to earn your first mark of honor.</p>}</div></section>
  </>
}

function GrowthJournal({data}:{data:GameState}){
  const maximum=Math.max(10,...Object.values(data.stats))
  const activity=Array.from({length:7},(_,index)=>{
    const date=new Date(`${data.today}T00:00:00.000Z`);date.setUTCDate(date.getUTCDate()-6+index)
    const day=date.toISOString().slice(0,10)
    return {day,label:new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(date).slice(0,1),count:data.weekDays.find(entry=>entry.day===day)?.count??0}
  })
  return <section className="growth-journal"><div className="panel-title"><div><span className="panel-kicker">YOUR PATH, IN PRACTICE</span><h2>Growth journal</h2></div><Activity size={17}/></div><div className="growth-content"><div className="attribute-grid">{categories.map(category=>{const Icon=statIcons[category];const value=data.stats[category]??0;return <article className={`attribute-card ${category.toLowerCase()}`} key={category}><div className="attribute-name"><span><Icon size={15}/></span><b>{category}</b><strong>{value}</strong></div><div className="attribute-meter"><i style={{width:`${Math.min(100,value/maximum*100)}%`}}/></div><small>{categoryDescription[category]}</small></article>})}</div><div className="weekly-activity"><div className="weekly-head"><div><b>Weekly momentum</b><span>QUESTS COMPLETED BY DAY</span></div><div className="weekly-total"><strong>{data.week.count}</strong><small>QUESTS · {data.week.xp} XP</small></div></div><div className="activity-bars">{activity.map(entry=><div className={`activity-day ${entry.day===data.today?'today':''}`} key={entry.day}><div className="activity-bar-track"><i style={{height:`${entry.count?Math.max(14,Math.min(100,entry.count*24)):4}%`}} title={`${entry.count} quests`}/></div><span>{entry.label}</span></div>)}</div></div></div></section>
}

function QuestBoard({data,completedCount,busy,onComplete,questOpen,setQuestOpen,questTitle,setQuestTitle,questCategory,setQuestCategory,onAdd}:{data:GameState;completedCount:number;busy:string|null;onComplete:(quest:Quest)=>void;questOpen:boolean;setQuestOpen:(value:boolean)=>void;questTitle:string;setQuestTitle:(value:string)=>void;questCategory:StatName;setQuestCategory:(value:StatName)=>void;onAdd:(event:FormEvent)=>void}){
  return <><PageHeading kicker="THE DAILY ADVENTURE" title="Quest board" subtitle="Real-life tasks, recast as small adventures." action={<button className="gold-button compact-button" onClick={()=>setQuestOpen(!questOpen)}><Plus size={15}/>New quest</button>}/><div className="quest-summary"><span><Target size={15}/> {completedCount} OF {data.quests.length} COMPLETED</span><span><Coins size={14}/> +10 COINS PER QUEST</span></div>
    {questOpen&&<form className="quest-create" onSubmit={onAdd}><div><label htmlFor="quest-title">QUEST TITLE</label><input id="quest-title" autoFocus required maxLength={80} value={questTitle} onChange={e=>setQuestTitle(e.target.value)} placeholder="Name your next small victory"/></div><div><label htmlFor="quest-category">PATH</label><select id="quest-category" value={questCategory} onChange={e=>setQuestCategory(e.target.value as StatName)}>{categories.map(category=><option key={category}>{category}</option>)}</select></div><button className="gold-button" type="submit"><Plus size={15}/>Add to board</button></form>}
    <div className="quest-board">{categories.map(category=>{const list=data.quests.filter(quest=>quest.category===category);const Icon=statIcons[category];return <section className="quest-category" key={category}><div className={`category-heading ${category.toLowerCase()}`}><span><Icon size={17}/></span><div><b>{category} path</b><small>{categoryDescription[category]}</small></div><i>{list.filter(quest=>quest.doneOn===data.today).length}/{list.length}</i></div>{list.length?list.map(quest=><QuestRow key={quest.id} quest={quest} today={data.today} busy={busy===quest.id} onComplete={()=>onComplete(quest)}/>):<p className="category-empty">No quests on this path yet.</p>}</section>})}</div>
  </>
}
const categoryDescription:Record<StatName,string>={Mind:'Learn, read, and stay curious.',Body:'Move, rest, and care for yourself.',Focus:'Make space for meaningful work.',Social:'Reach out and grow together.'}
function QuestRow({quest,today,busy,onComplete,compact=false}:{quest:Quest;today:string;busy?:boolean;onComplete?:()=>void;compact?:boolean}){
  const completed=quest.doneOn===today;const Icon=statIcons[quest.category]
  return <div className={`quest-row-v2 ${completed?'completed':''} ${compact?'compact':''}`}><span className={`quest-mark ${quest.category.toLowerCase()}`}><Icon size={16}/></span><span className="quest-copy"><b>{quest.title}</b><small>{quest.category.toUpperCase()} PATH <i>·</i> +1 {quest.stat.toUpperCase()}</small></span><span className="quest-xp"><Zap size={13}/>{quest.xp} XP</span>{onComplete&&<button className={completed?'quest-check checked':'quest-check'} onClick={onComplete} disabled={completed||busy} aria-label={completed?'Quest completed':'Complete quest'}>{completed?<Check size={15}/>:busy?'…':'+'}</button>}{!onComplete&&completed&&<span className="completed-tag">DONE</span>}</div>
}

function SkillTree({data,busy,onUnlock}:{data:GameState;busy:string|null;onUnlock:(skill:Skill)=>void}){
  return <><PageHeading kicker="GROW INTO YOUR STRENGTH" title="Skill tree" subtitle="Spend skill points on small bonuses that support your real-life quests." action={<div className="points-badge"><Sparkles size={16}/><b>{data.profile.skillPoints}</b><span>SKILL POINTS</span></div>}/><div className="skill-intro"><div className="skill-intro-icon"><Star size={20}/></div><p>Every level brings a new point. Unlock the first spark at Level 2, then deepen that path at Level 5.</p><span>250 XP = 1 LEVEL</span></div><div className="skill-grid">{categories.map(category=>{const Icon=statIcons[category];const branch=data.skills.filter(skill=>skill.category===category).sort((a,b)=>a.tier-b.tier);return <section className={`skill-branch-card ${category.toLowerCase()}`} key={category}><header><span><Icon size={18}/></span><div><b>{category} path</b><small>{categoryDescription[category]}</small></div></header><div className="skill-nodes">{branch.map((skill,index)=><div className={`skill-node-card ${skill.unlocked?'unlocked':''} ${skill.canUnlock?'ready':''}`} key={skill.id}><div className="node-track"><span className="node-orb">{skill.unlocked?<Check size={15}/>:skill.tier===1?<Sparkles size={15}/>:<LockKeyhole size={14}/>}</span>{index<branch.length-1&&<i/>}</div><div className="node-copy"><div><b>{skill.name}</b><span className="node-level">TIER {skill.tier}</span></div><p>{skill.description}</p>{skill.unlocked?<span className="node-state"><Check size={12}/> MASTERED</span>:<button disabled={!skill.canUnlock||busy===skill.id} onClick={()=>onUnlock(skill)} className="unlock-button">{busy===skill.id?'UNLOCKING…':skill.canUnlock?`UNLOCK · ${skill.cost} PT`:`LVL ${skill.minLevel} · ${skill.cost} PT`}</button>}</div></div>)}</div></section>})}</div></>
}

function Armory({data,character,busy,onBuy,onEquip}:{data:GameState;character:Character;busy:string|null;onBuy:(item:ShopItem)=>void;onEquip:(slot:EquipmentSlot,itemId:string|null)=>void}){
  const ownedItems=data.shopItems.filter(item=>data.inventory.includes(item.id))
  return <><PageHeading kicker="EQUIPMENT & TREASURES" title="The armory" subtitle="Find your next look, dress your hero, and get back on the road." action={<div className="coin-purse"><Coins size={17}/><b>{data.profile.coins}</b><span>COINS</span></div>}/><div className="armory-layout"><section className={`armory-hero look-${character.look}`}><div className="armory-glow"/><CharacterPortrait look={character.look} equipment={data.equipment}/><div className="armory-hero-copy"><span>YOUR CURRENT HERO</span><h2>{character.name}</h2><p>{character.className} · Level {Math.floor(data.profile.xp/250)+1}</p><b><Sparkles size={13}/>{character.tagline}</b></div></section><section className="gear-slots"><div className="panel-title"><div><span className="panel-kicker">CURRENT LOADOUT</span><h2>Equipped gear</h2></div><Shield size={17}/></div>{slots.map(slot=>{const equipped=data.shopItems.find(item=>item.id===data.equipment[slot]);const options=ownedItems.filter(item=>item.slot===slot);return <div className="gear-slot" key={slot}><span className="gear-slot-icon">{slot==='headwear'?<Crown size={16}/>:slot==='outfit'?<Shield size={16}/>:<Gem size={16}/>}</span><div><small>{slotNames[slot].toUpperCase()}</small><b>{equipped?.name??'Starter gear'}</b></div>{equipped&&<button onClick={()=>onEquip(slot,null)} disabled={busy===slot}>UNEQUIP</button>}{options.filter(item=>item.id!==equipped?.id).map(item=><button key={item.id} onClick={()=>onEquip(slot,item.id)} disabled={busy===slot}>EQUIP {item.name}</button>)}</div>})}</section></div><div className="shop-heading"><div><div className="section-kicker">GUILD TRADING POST</div><h2>Find a little magic.</h2></div><span>QUESTS EARN COINS · ITEMS ARE COSMETIC</span></div><div className="shop-grid">{data.shopItems.map(item=>{const owned=data.inventory.includes(item.id);const equipped=data.equipment[item.slot]===item.id;return <article className={`shop-item ${item.rarity.toLowerCase()}`} key={item.id}><div className="item-art" style={{'--item-accent':item.accent} as React.CSSProperties}><ItemGlyph item={item}/><span>{item.rarity.toUpperCase()}</span></div><div className="item-info"><small>{slotNames[item.slot].toUpperCase()} · {item.rarity.toUpperCase()}</small><h3>{item.name}</h3><p>{item.description}</p><div className="item-action">{owned?<button className={equipped?'item-owned':'item-equip'} onClick={()=>onEquip(item.slot,equipped?null:item.id)} disabled={busy===item.slot}>{equipped?'EQUIPPED':`EQUIP · ${item.name}`}</button>:<button className="item-buy" onClick={()=>onBuy(item)} disabled={busy===item.id}><Coins size={14}/>{item.price} <span>BUY</span></button>}</div></div></article>})}</div><p className="cosmetic-note"><Moon size={14}/> No stat penalties. Dress for the quest you’re on.</p></>
}
function ItemGlyph({item}:{item:ShopItem}){return <svg viewBox="0 0 80 72" aria-hidden="true"><path d="M40 7 46 27 68 31 51 45 56 66 40 54 24 66 29 45 12 31 34 27Z" fill="var(--item-accent)" opacity=".22"/><path d={item.slot==='headwear'?'M17 43c2-16 13-27 24-27s22 11 24 27H17Zm-4 2h56v7H13z':item.slot==='outfit'?'m26 13 14 8 14-8 14 12-10 12-3 23H25l-3-23-10-12 14-12Z':'M40 10c-12 16-22 22-22 34a22 22 0 0 0 44 0C62 32 52 26 40 10Z'} fill="var(--item-accent)"/><circle cx="40" cy="43" r="6" fill="#151720" opacity=".75"/></svg>}

function Achievements({data}:{data:GameState}){const unlocked=data.achievements.filter(item=>item.unlocked).length;return <><PageHeading kicker="MARKS OF YOUR JOURNEY" title="Achievements" subtitle="Every milestone is proof that you showed up." action={<div className="points-badge"><Trophy size={16}/><b>{unlocked}/{data.achievements.length}</b><span>UNLOCKED</span></div>}/><div className="achievement-wall">{data.achievements.map(item=>{const Icon=achievementIcons[item.icon]??Award;return <article className={`achievement-card ${item.unlocked?'earned':'locked'}`} key={item.id}><div className="achievement-art"><span><Icon size={21}/></span><i>✦</i></div><div><small>{item.unlocked?'MARK OF HONOR':'MILESTONE'}</small><h3>{item.name}</h3><p>{item.description}</p></div><span className="achievement-status">{item.unlocked?<><Check size={12}/> EARNED</>:<LockKeyhole size={13}/>}</span></article>})}</div><div className="achievement-note"><Sparkles size={16}/><span>New milestones unlock automatically as your quest history grows.</span></div></>}

function CharacterPortrait({look,equipment={}}:{look:CharacterLook;equipment?:Partial<Record<EquipmentSlot,string>>}){
  const palette={violet:{skin:'#bd8060',hair:'#312a31',clothes:'#78639e',detail:'#d2b8e8'},green:{skin:'#94634c',hair:'#252d2b',clothes:'#527b5c',detail:'#d4b46d'},orange:{skin:'#c78f69',hair:'#633d36',clothes:'#c4774e',detail:'#f0c47b'},blue:{skin:'#ae785f',hair:'#302c37',clothes:'#617e9f',detail:'#c9d7eb'}}[look]
  return <svg className="portrait-svg" viewBox="0 0 120 150" role="img" aria-label={`${characters.find(item=>item.look===look)?.name??'Hero'} character`}>
    <ellipse cx="60" cy="142" rx="39" ry="5" fill="#08090d" opacity=".28"/>
    <path d="M13 145c2-27 17-41 47-41s45 14 47 41H13Z" fill={palette.clothes}/><path d="M45 102h30l7 17c-14 10-30 10-44 0l7-17Z" fill={palette.skin}/>
    <path d="M20 145c5-18 16-27 29-31l11 15 12-15c15 4 25 13 29 31H20Z" fill={palette.clothes}/><path d="m49 111 11 18 12-18 8 5-8 29H48l-8-29 9-5Z" fill={palette.detail}/>
    <path d="M33 51c0-24 12-37 29-37 20 0 30 15 27 40l-5 28c-3 17-14 27-27 27-15 0-26-12-28-29l4-29Z" fill={palette.skin}/>
    {look==='violet'&&<path d="M31 55C26 25 41 8 62 8c24 0 34 19 30 45l-8-9-4-17c-11 7-25 10-43 8l-2 22-6 14-2-16Z" fill={palette.hair}/>}
    {look==='green'&&<><path d="M30 53C26 24 40 9 60 9c22 0 35 18 30 43l-7 15-4-29c-11 4-21 4-31 0l-9 27-9-12Z" fill={palette.hair}/><circle cx="38" cy="30" r="8" fill={palette.hair}/><circle cx="52" cy="17" r="8" fill={palette.hair}/><circle cx="70" cy="18" r="8" fill={palette.hair}/><circle cx="84" cy="31" r="8" fill={palette.hair}/></>}
    {look==='orange'&&<path d="M31 49C29 20 43 7 62 7c19 0 31 13 29 39l-5-6-5-17c-11 7-23 8-39 4l-5 29-7 10-2-17Z" fill={palette.hair}/>}
    {look==='blue'&&<><path d="M27 57C25 22 42 8 62 8c22 0 35 19 30 49l-7 35-9 5 5-50c-11 7-27 8-42 2l3 48-10-8-5-32Z" fill={palette.hair}/><path d="M32 38c4-24 17-34 32-32 16 1 26 13 26 31-18 6-39 7-58 1Z" fill="#7189a4"/><path d="M37 36c12 5 31 5 49-1" fill="none" stroke="#d4dfeb" strokeWidth="3"/></>}
    <path d="M45 65c3-2 7-2 10 0M67 65c3-2 7-2 10 0" fill="none" stroke="#3d3835" strokeWidth="2" strokeLinecap="round"/><circle cx="51" cy="70" r="1.6" fill="#342e2b"/><circle cx="71" cy="70" r="1.6" fill="#342e2b"/><path d="M56 82c3 2 6 2 9 0" fill="none" stroke="#8d5149" strokeWidth="1.6" strokeLinecap="round"/>
    {look==='violet'&&<><circle cx="49" cy="70" r="8" fill="none" stroke="#594b59" strokeWidth="1.5"/><circle cx="73" cy="70" r="8" fill="none" stroke="#594b59" strokeWidth="1.5"/><path d="M57 69h8" stroke="#594b59" strokeWidth="1.5"/></>}
    <path d="M35 105c-7 10-11 20-12 40M85 105c7 10 11 20 12 40" fill="none" stroke={palette.detail} strokeWidth="5" strokeLinecap="round"/>
    {equipment.outfit&&<path d="M24 119c13-7 23-8 36 3 10-10 20-11 36-3l-5 27H30Z" fill={equipment.outfit==='dawn-mantle'?'#d99e61':'#577a69'} opacity=".8"/>}
    {equipment.headwear==='leaf-circlet'&&<><path d="M34 39q26-19 52 0" fill="none" stroke="#d5bb71" strokeWidth="3"/><path d="M43 35l-4-8m18 2 1-9m17 14 5-8" stroke="#a5bb76" strokeWidth="3" strokeLinecap="round"/></>}
    {equipment.headwear==='starlit-hood'&&<path d="M29 64C19 23 38 4 62 4c27 0 39 25 27 62l-8-18c-11 7-28 8-43 3l-4 21Z" fill="none" stroke="#9b83c2" strokeWidth="6" strokeLinejoin="round"/>}
    {equipment.accessory==='moon-charm'&&<><path d="M43 107q17 20 34 0" fill="none" stroke="#a8bfdc" strokeWidth="2"/><path d="M60 123c-5 6-6 9 0 12 6-3 5-6 0-12Z" fill="#c4d5e8"/></>}
    {equipment.accessory==='sun-compass'&&<><path d="M43 107q17 20 34 0" fill="none" stroke="#d8b45f" strokeWidth="2"/><circle cx="60" cy="128" r="5" fill="#e5bd6d" stroke="#fff0bd" strokeWidth="1.5"/></>}
  </svg>
}
