import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, Award, Backpack, BarChart3, BookOpen, Check, ChevronDown, ChevronRight,
  CircleHelp, Compass, Flame, Footprints, Heart, Leaf, LockKeyhole, Plus, Settings2,
  Shield, Sparkles, Swords, Target, Trophy, Users, WandSparkles, Zap,
} from 'lucide-react'

type StatName = 'Mind' | 'Body' | 'Focus' | 'Social'
type Quest = { id:string; title:string; category:StatName; xp:number; stat:StatName; doneOn:string|null }
type GameState = {
  profile:{name:string;class:string;xp:number;streak:number}
  quests:Quest[]; stats:Record<StatName,number>; week:{count:number;xp:number}
  weekDays:{day:string;count:number;xp:number}[]; today:string
}
const classes=[
  {name:'The Scholar',icon:BookOpen,description:'Learn a little every day.',color:'violet'},
  {name:'The Adventurer',icon:Compass,description:'Build a life in motion.',color:'green'},
  {name:'The Creator',icon:WandSparkles,description:'Make ideas real.',color:'orange'},
  {name:'The Socialite',icon:Users,description:'Grow through connection.',color:'blue'},
]
const statsList:StatName[]=['Mind','Body','Focus','Social']
const statIcons={Mind:BookOpen,Body:Heart,Focus:Target,Social:Users}
const weekLabels=['M','T','W','T','F','S','S']

export default function App(){
  const [data,setData]=useState<GameState|null>(null)
  const [error,setError]=useState('')
  const [newQuest,setNewQuest]=useState('')
  const [category,setCategory]=useState<StatName>('Focus')
  const [showForm,setShowForm]=useState(false)
  const [activeNav,setActiveNav]=useState('Today')
  const [toast,setToast]=useState('')
  const [busy,setBusy]=useState<string|null>(null)
  const refresh=async()=>{const response=await fetch('/api/state');if(!response.ok)throw new Error('Could not load your adventure.');setData(await response.json() as GameState)}
  useEffect(()=>{refresh().catch(()=>setError('Start the local app with npm run dev to load your SQLite save.'))},[])
  const doneCount=useMemo(()=>data?.quests.filter(q=>q.doneOn===data.today).length??0,[data])
  const totalCount=data?.quests.length??0
  const xp=data?.profile.xp??0
  const level=Math.floor(xp/250)+1
  const xpInLevel=xp%250
  const xpPercent=xpInLevel/250*100
  const character=classes.find(c=>c.name===data?.profile.class)??classes[0]
  const completedDays=new Set(data?.weekDays.map(d=>d.day)??[])
  const start=new Date(); start.setDate(start.getDate()-6)
  const weekDays=Array.from({length:7},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return date.toISOString().slice(0,10)})
  async function completeQuest(quest:Quest){
    if(!data||quest.doneOn===data.today)return
    setBusy(quest.id)
    try{const response=await fetch(`/api/quests/${quest.id}/complete`,{method:'PATCH'});if(!response.ok)throw new Error();await refresh();setToast(`Quest complete · +${quest.xp} XP`);window.setTimeout(()=>setToast(''),2600)}catch{setError('Could not save quest completion. Please try again.')}finally{setBusy(null)}
  }
  async function addQuest(event:FormEvent){
    event.preventDefault();if(!newQuest.trim())return
    try{const response=await fetch('/api/quests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newQuest,category})});if(!response.ok)throw new Error();setNewQuest('');setShowForm(false);await refresh();setToast('Quest added to your day');window.setTimeout(()=>setToast(''),2400)}catch{setError('Could not add quest. Please try again.')}
  }
  async function changeClass(name:string){
    try{const response=await fetch('/api/profile/class',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({class:name})});if(!response.ok)throw new Error();await refresh();setToast(`Class changed to ${name}`);window.setTimeout(()=>setToast(''),2400)}catch{setError('Could not update your class.')}
  }
  const scrollTo=(id:string)=>{setActiveNav(id==='daily-quests'?'Quests':id==='skill-tree'?'Skills':'Today');document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark"><Swords size={17}/></span><span>life<span className="brand-light">rpg</span></span></a>
      <div className="side-label">YOUR ADVENTURE</div>
      <button className={`nav-item ${activeNav==='Today'?'active':''}`} onClick={()=>scrollTo('top')}><Activity size={16}/>Today</button>
      <button className={`nav-item ${activeNav==='Quests'?'active':''}`} onClick={()=>scrollTo('daily-quests')}><Target size={16}/>Daily quests<span className="nav-count">{doneCount}/{totalCount}</span></button>
      <button className={`nav-item ${activeNav==='Skills'?'active':''}`} onClick={()=>scrollTo('skill-tree')}><Sparkles size={16}/>Skill tree</button>
      <button className="nav-item" onClick={()=>scrollTo('progress')}><BarChart3 size={16}/>Progress</button>
      <div className="side-bottom"><div className="side-quote"><span>“</span>Small steps count.<br/>Every single one.</div><div className="profile-mini"><div className="mini-avatar">{data?.profile.name.split(' ').map(n=>n[0]).join('')??'AM'}</div><div><strong>{data?.profile.name??'Your character'}</strong><small>Level {level} · {data?.profile.class.replace('The ','')??'Adventurer'}</small></div><Settings2 size={15}/></div></div>
    </aside>

    <main id="top" className="main-content">
      <header className="topbar"><div className="breadcrumb">My world <ChevronRight size={13}/><strong>Today</strong></div><div className="top-actions"><span className="save-status"><i/> Saved locally</span><button className="icon-btn" aria-label="Help"><CircleHelp size={17}/></button></div></header>
      <div className="page-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-mark">✳</span> YOUR ADVENTURE, YOUR PACE</div><h1>Make today <em>count.</em></h1><p className="welcome-copy">A little progress is still progress. What will you take on today?</p></div><div className="date-chip"><span className="date-sun">☼</span><span><strong>{new Date().toLocaleDateString('en-US',{weekday:'long'})}</strong><small>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'})}</small></span></div></section>
        {error&&<div className="error-banner">{error}<button onClick={()=>{setError('');refresh().catch(()=>setError('Start the local app with npm run dev to load your SQLite save.'))}}>Retry</button></div>}

        <section className="hero-grid">
          <div className="character-card">
            <div className="character-copy"><div className="class-label"><span className="class-dot"/> {character.name.toUpperCase()}</div><h2>{data?.profile.name.split(' ')[0]??'Your'}<br/><em>the growing.</em></h2><p>One quest at a time.<br/>That’s how legends begin.</p><div className="level-row"><span>LVL {level}</span><span>{xpInLevel} <i>/ 250 XP</i></span></div><div className="xp-track"><span style={{width:`${xpPercent}%`}}/></div><button className="class-switch" onClick={()=>document.getElementById('class-picker')?.scrollIntoView({behavior:'smooth',block:'center'})}>Change class <ChevronRight size={13}/></button></div>
            <div className="character-art" aria-hidden="true"><div className="sun-disc"/><div className="orbital orbital-one"/><div className="orbital orbital-two"/><div className="avatar-illustration"><div className="cape"/><div className="body-shape"/><div className="head-shape"><i/><b/></div><div className="scarf"/><div className="spark spark-one">✦</div><div className="spark spark-two">✳</div></div><div className="art-caption">YOUR STORY IS UNFOLDING</div></div>
          </div>
          <div className="stats-column"><div className="stat-card streak-card"><div className="stat-symbol flame"><Flame size={18} fill="currentColor"/></div><div><div className="stat-label">CURRENT STREAK</div><div className="stat-number">{data?.profile.streak??0}<small> days</small></div></div><span className="streak-caption">Keep the<br/>spark alive</span></div><div className="stat-card quest-progress"><div className="stat-label">TODAY’S QUESTS</div><div className="quest-progress-row"><strong>{doneCount}<small>/{totalCount}</small></strong><span>{totalCount>0?Math.round(doneCount/totalCount*100):0}% complete</span></div><div className="progress-track"><span style={{width:`${totalCount?doneCount/totalCount*100:0}%`}}/></div><div className="quest-progress-foot"><span>Keep going, you’ve got this.</span><Trophy size={15}/></div></div><div className="stat-card xp-card"><div className="stat-symbol bolt"><Zap size={17} fill="currentColor"/></div><div><div className="stat-label">XP EARNED THIS WEEK</div><div className="stat-number">{(data?.week.xp??0).toLocaleString()}<small> XP</small></div></div><div className="xp-sparkline"><i/><i/><i/><i/><i/><i/><i/></div></div></div>
        </section>

        <section className="section quest-section" id="daily-quests"><div className="section-heading"><div><div className="eyebrow">THE DAILY ADVENTURE</div><h2>Your quests <span className="quest-counter">{doneCount} / {totalCount}</span></h2></div><button className="add-quest-btn" onClick={()=>setShowForm(!showForm)}><Plus size={15}/><span>New quest</span></button></div>
          {showForm&&<form className="new-quest-form" onSubmit={addQuest}><input autoFocus value={newQuest} onChange={e=>setNewQuest(e.target.value)} placeholder="What would you like to do?" maxLength={80}/><select value={category} onChange={e=>setCategory(e.target.value as StatName)}>{statsList.map(s=><option key={s}>{s}</option>)}</select><button className="small-primary" type="submit">Add quest</button></form>}
          <div className="quest-list">{data?.quests.map((quest)=>{const done=quest.doneOn===data.today;const Icon=statIcons[quest.category];return <article className={`quest-row ${done?'quest-done':''}`} key={quest.id}><div className={`quest-icon quest-icon-${quest.category.toLowerCase()}`}><Icon size={17}/></div><div className="quest-info"><h3>{quest.title}</h3><div className="quest-meta"><span>{quest.category}</span><i>·</i><span>{quest.stat} +1</span></div></div><div className="quest-reward"><Zap size={13}/>{quest.xp} XP</div><button className={`complete-btn ${done?'done':''}`} onClick={()=>completeQuest(quest)} disabled={done||busy===quest.id} aria-label={done?'Quest completed':'Complete quest'}>{done?<Check size={16}/>:busy===quest.id?'…':'+'}</button></article>})}</div>
          <div className="quest-encouragement"><Leaf size={14}/><span>Small quests. Real momentum. You’re doing great.</span><span className="encouragement-stars">✦ ✦ ✦</span></div>
        </section>

        <section className="lower-grid" id="progress"><div className="panel stats-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR CHARACTER</div><h2>Growing stats</h2></div><button className="more-btn" aria-label="More stats"><ChevronDown size={16}/></button></div><div className="attribute-list">{statsList.map((stat)=>{const Icon=statIcons[stat];const value=data?.stats[stat]??1;return <div className="attribute" key={stat}><div className={`attribute-icon ${stat.toLowerCase()}`}><Icon size={15}/></div><div className="attribute-name">{stat}</div><div className="attribute-track"><span style={{width:`${Math.min(value*10,100)}%`}}/></div><strong>{value}</strong></div>})}</div><div className="stats-foot"><span><span className="tiny-spark">✳</span> Every quest makes you stronger</span><span>+1 per quest</span></div></div>
          <div className="panel week-panel"><div className="panel-heading"><div><div className="eyebrow">SHOWING UP MATTERS</div><h2>This week</h2></div><div className="week-total"><strong>{data?.week.count??0}</strong><small>quests</small></div></div><div className="week-chart">{weekDays.map((day,i)=>{const hit=completedDays.has(day);return <div className="chart-day" key={day}><div className={`chart-bar ${hit?'has-activity':''}`} style={{height:hit?'68%':`${24+(i%3)*7}%`}}>{hit&&<span>✓</span>}</div><small>{weekLabels[i]}</small></div>})}</div><div className="week-foot"><span><i/> Quest completed</span><strong>{data?.week.xp??0} XP earned</strong></div></div></section>

        <section className="section skill-section" id="skill-tree"><div className="section-heading"><div><div className="eyebrow">YOUR JOURNEY, BRANCHING OUT</div><h2>Skill tree <span className="tree-subtitle">Choose what grows next.</span></h2></div><button className="text-link" onClick={()=>showToastMessage(setToast)}>View all skills <ChevronRight size={14}/></button></div><div className="skill-path"><div className="skill-root"><div className="skill-node unlocked"><Sparkles size={17}/></div><span>Start here</span></div><div className="skill-branch"><div className="skill-card unlocked-skill"><div className="skill-node unlocked"><BookOpen size={17}/></div><div><strong>Curious mind</strong><small>Complete 5 Mind quests</small></div><span className="skill-status">UNLOCKED</span></div><div className="skill-connector"/><div className="skill-card"><div className="skill-node locked"><Footprints size={17}/></div><div><strong>Daily rhythm</strong><small>Reach a 7-day streak</small></div><span className="skill-status locked-label"><LockKeyhole size={11}/> LOCKED</span></div><div className="skill-connector"/><div className="skill-card"><div className="skill-node locked"><Shield size={17}/></div><div><strong>Steady hands</strong><small>Reach level 8</small></div><span className="skill-status locked-label"><LockKeyhole size={11}/> LOCKED</span></div></div><div className="skill-side-branch"><div className="skill-card side-skill"><div className="skill-node unlocked"><Heart size={17}/></div><div><strong>Body in motion</strong><small>Complete 5 Body quests</small></div><span className="skill-status">IN PROGRESS</span></div><div className="side-line"/><div className="skill-card"><div className="skill-node locked"><Backpack size={17}/></div><div><strong>Balanced life</strong><small>Grow all four attributes</small></div><span className="skill-status locked-label"><LockKeyhole size={11}/> LOCKED</span></div></div></div></section>

        <section className="class-section" id="class-picker"><div className="section-heading"><div><div className="eyebrow">PICK YOUR PLAYSTYLE</div><h2>Choose your class</h2></div><span className="class-current">CURRENT: {character.name.toUpperCase()}</span></div><div className="class-grid">{classes.map((c)=>{const Icon=c.icon;return <button key={c.name} onClick={()=>changeClass(c.name)} className={`class-option ${c.color} ${character.name===c.name?'selected':''}`}><span className="class-option-icon"><Icon size={18}/></span><strong>{c.name}</strong><small>{c.description}</small>{character.name===c.name&&<span className="selected-mark"><Check size={12}/></span>}</button>})}</div></section>

        <section className="achievement-section"><div className="section-heading"><div><div className="eyebrow">MILESTONES, BIG AND SMALL</div><h2>Achievements</h2></div><span className="achievement-count"><Award size={14}/> 2 unlocked</span></div><div className="achievement-list"><div className="achievement unlocked"><span className="achievement-icon"><Footprints size={18}/></span><span><strong>First steps</strong><small>Complete your first quest</small></span><Check size={15}/></div><div className="achievement unlocked"><span className="achievement-icon golden"><Flame size={18}/></span><span><strong>On a roll</strong><small>Build a 3-day streak</small></span><Check size={15}/></div><div className="achievement locked-ach"><span className="achievement-icon"><Trophy size={18}/></span><span><strong>Quest collector</strong><small>Complete 25 quests</small></span><LockKeyhole size={14}/></div></div></section>
        <footer className="page-footer"><span>LIFE RPG</span><i>·</i> Your life, your adventure <span className="footer-note">Progress over perfection, always.</span></footer>
      </div>
    </main>
    {toast&&<div className="toast" role="status"><Sparkles size={15}/>{toast}</div>}
  </div>
}
function showToastMessage(setToast:(s:string)=>void){setToast('More skill paths are coming soon.');window.setTimeout(()=>setToast(''),2400)}
