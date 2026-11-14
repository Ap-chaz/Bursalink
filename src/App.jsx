import {useState} from 'react'
import * as api from './lib/api.js'
import {placeOk,daysLeft,isOpen,eligibility,completion,validateFile,DECIDED} from './lib/rules.js'
import {compress} from './lib/files.js'
import {tr} from './lib/i18n.js'
import {GEO} from './lib/data.js'
import Site from './Site.jsx'
import {Mark} from './Shell.jsx'
const ST={submitted:'● Submitted',under_review:'◐ Under review',more_info_needed:'⚠ More information needed',shortlisted:'★ Shortlisted',approved:'✔ Approved',unsuccessful:'○ Unsuccessful',withdrawn:'– Withdrawn'}
const money=b=>`KES ${b.min.toLocaleString()}–${b.max.toLocaleString()}`
const where=b=>b.place?.name||'Everyone'
export default function App(){
 const [s,setS]=useState(api.load()),[tab,setTab]=useState('home'),[view,setView]=useState(null),[intro,setIntro]=useState(0),[mode,setMode]=useState('signin'),[err,setErr]=useState('')
 const l=s.profile.lang,t=k=>tr(l,k),B=api.listBursaries(),area=s.profile.area
 const act=async fn=>{try{setErr('');await fn();setS(api.load());return true}catch(e){setErr(e.message);return false}}
 const go=(tb,v=null)=>{setTab(tb);setView(v)}
 const Lang=()=><button className="secondary" style={{width:'auto'}} onClick={()=>act(()=>api.updateProfile({lang:l==='en'?'sw':'en'}))}>{l==='en'?'Kiswahili':'English'}</button>
 const bar=(full,unread=0)=><header className="appbar"><div className="appbarin"><a className="brand" href="#/" onClick={e=>{e.preventDefault();if(!s.user)setIntro(0)}}><Mark/><b>BursaLink</b></a>{full&&<div className="dtabs">{['home','discover','applications','profile'].map(k=><button key={k} className={tab===k?'on':''} onClick={()=>go(k)}>{t(k)}</button>)}</div>}<div className="abr"><Lang/>{full&&<button className="secondary" aria-label={t('notifs')} onClick={()=>go('profile',{v:'notifs'})}>🔔{unread?' '+unread:''}</button>}</div></div></header>
 const appFor=id=>s.apps.find(a=>a.bursaryId===id)
 const action=b=>appFor(b.id)?<span className="badge">✔ {t('applied')}</span>:b.status!=='published'||!isOpen(b)?<span className="badge no">{t('closed')}</span>:!placeOk(b,area)?<div><span className="badge no">✖ {t('na')}</span><p className="muted">Only for {b.place.name} residents.</p></div>:<button className="primary" onClick={()=>go('discover',{v:'bursary',id:b.id})}>{t('apply')}</button>
 const Card=b=><div className={'card '+(isOpen(b)&&daysLeft(b)<=3?'urgent':'')} key={b.id}><small>{b.org}</small><h3>{b.title}</h3><p>{b.desc}</p><p>{money(b)} · {where(b)} · {b.levels.join(', ')}</p><p>{isOpen(b)?`${daysLeft(b)} ${t('left')}${daysLeft(b)<=3?' ⚠':''}`:''}</p>
  <div className="row"><div onClick={()=>go('discover',{v:'bursary',id:b.id})}>{action(b)}</div><button className="secondary" onClick={()=>act(()=>api.toggleSave(b.id))}>{s.saved.includes(b.id)?'★ Saved':'☆ Save'}</button></div></div>
 // ---- Auth & onboarding
 if(!s.user)return intro<3?<Site lang={l} toggle={()=>act(()=>api.updateProfile({lang:l==='en'?'sw':'en'}))} start={m=>{setMode(m==='register'?'register':'signin');setIntro(3)}}/>:<div className="app">{bar()}<main className="narrow"><Login {...{act,err,t,mode,setMode}}/></main></div>
 if(!area)return <div className="app">{bar()}<main className="narrow"><AreaForm act={act} err={err} t={t}/></main></div>
 // ---- Screens
 const unread=s.notifs.filter(n=>!n.read).length
 let body
 if(tab==='home')body=<Home {...{s,B,t,go,Card,appFor}}/>
 if(tab==='discover')body=view?.v==='bursary'?<Details b={B.find(b=>b.id===view.id)} {...{s,t,act,go,action,err}}/>:<Discover {...{B,s,t,Card}}/>
 if(tab==='applications')body=<Apps {...{s,B,t,act,go,view,Card,err}}/>
 if(tab==='profile')body=view?.v==='notifs'?<Notifs {...{s,t,act,go}}/>:<Profile {...{s,t,act,go,err,unread,home:()=>setIntro(0)}}/>
 return <div className="app">{bar(true,unread)}<main>{body}</main>
 <nav className="tabs">{['home','discover','applications','profile'].map(k=><button key={k} className={tab===k?'on':''} onClick={()=>go(k)}>{t(k)}</button>)}</nav></div>}
function Welcome({intro,setIntro,t}){const P=['Find bursaries made for you.','Apply from your phone. It is free.','Track every step until a decision.'];return <div className="card"><h2>{P[intro]}</h2><p>{intro+1} / 3</p><button className="primary" onClick={()=>setIntro(intro+1)}>{t('cont')}</button><p/><button className="secondary" onClick={()=>setIntro(3)}>Skip</button></div>}
function Login({act,err,t,mode,setMode}){const reg=mode==='register',[e,setE]=useState(''),[n,setN]=useState(''),[c,setC]=useState(''),[agree,setAgree]=useState(false),[sent,setSent]=useState(false)
 const reset=m=>{setMode(m);setSent(false);setC('')}
 const submit=async ev=>{ev.preventDefault();if(!sent){setSent(await act(()=>api.sendCode(e)));return}
  if(await act(()=>api.verifyCode(e,c))&&reg&&n.trim())await act(()=>api.updateProfile({name:n.trim()}))}
 return <form className="card auth" onSubmit={submit}>
  <div className="seg" role="tablist">{[['signin','Sign in'],['register','Register']].map(([k,l])=><button key={k} type="button" role="tab" aria-selected={mode===k} className={mode===k?'on':''} onClick={()=>reset(k)}>{l}</button>)}</div>
  <h1>{reg?'Create your account':'Welcome back'}</h1><p className="muted">{reg?'It takes a minute and it is free.':'Enter your email and we send you a one-time code. No password needed.'}</p>
  {reg&&<><label htmlFor="nm">Full name</label><input id="nm" autoComplete="name" value={n} disabled={sent} onChange={x=>setN(x.target.value)}/></>}
  <label htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" inputMode="email" value={e} disabled={sent} onChange={x=>setE(x.target.value)}/>{err==='email'&&<p className="err">Please check your email address.</p>}
  {sent&&<><label htmlFor="cd">One-time code (demo: 123456)</label><input id="cd" autoComplete="one-time-code" inputMode="numeric" maxLength={6} autoFocus value={c} onChange={x=>setC(x.target.value)}/>{err==='code'&&<p className="err">{t('badcode')}</p>}</>}
  {reg&&!sent&&<label className="check"><input type="checkbox" checked={agree} onChange={x=>setAgree(x.target.checked)}/> <span>I agree to the <a href="#/terms" target="_blank" rel="noopener">Terms & Conditions</a> and <a href="#/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>}
  <button className="primary" type="submit" disabled={!sent&&reg&&(!n.trim()||!agree)}>{sent?(reg?'Create account':'Sign in'):'Send my code'}</button>
  {sent&&<button type="button" className="secondary" onClick={()=>setSent(false)}>Use a different email</button>}
  <p className="muted">{reg?'Already have an account?':'New to BursaLink?'} <a href="#" onClick={ev=>{ev.preventDefault();reset(reg?'signin':'register')}}>{reg?'Sign in':'Register'}</a></p><p className="muted">{t('free')}</p></form>}
function AreaForm({act,err,t}){const [co,setCo]=useState(''),[cn,setCn]=useState(''),[w,setW]=useState(''),[ok,setOk]=useState(false)
 return <div className="card"><h2>Where do you live?</h2><label>County</label><select value={co} onChange={e=>{setCo(e.target.value);setCn('');setW('')}}><option value="">Choose</option>{Object.keys(GEO).map(x=><option key={x}>{x}</option>)}</select>
 <label>Constituency</label><select value={cn} disabled={!co} onChange={e=>{setCn(e.target.value);setW('')}}><option value="">Choose</option>{co&&Object.keys(GEO[co]).map(x=><option key={x}>{x}</option>)}</select>
 <label>Ward</label><select value={w} disabled={!cn} onChange={e=>setW(e.target.value)}><option value="">Choose</option>{cn&&GEO[co][cn].map(x=><option key={x}>{x}</option>)}</select>
 <p><b>⚠ {t('lock')}</b></p><label className="check"><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}/> {t('confirm')}</label>
 <button className="primary" disabled={!w||!ok} onClick={()=>act(()=>api.registerArea({county:co,constituency:cn,ward:w}))}>{t('save')}</button>{err&&<p className="err">{err}</p>}</div>}
function Home({s,B,t,go,Card,appFor}){const open=B.filter(b=>isOpen(b)&&placeOk(b,s.profile.area)),p=completion(s.profile)
 const rec=open.filter(b=>!appFor(b.id)&&(!s.profile.level||b.levels.includes(s.profile.level))),need=s.apps.find(a=>a.status==='more_info_needed')
 const dead=open.filter(b=>daysLeft(b)<=14).sort((a,b)=>daysLeft(a)-daysLeft(b))
 return <><h1>{t('hi')}, {s.profile.name||'friend'}</h1>
 <div className="card accent"><small>{t('next')}</small>{need?<><p>Your application {need.ref} needs more information.</p><button className="primary" onClick={()=>go('applications',{v:'app',id:need.ref})}>Open it</button></>:p<100?<><p>Your profile is {p}% complete.</p><div className="bar"><i style={{width:p+'%'}}/></div><p/><button className="primary" onClick={()=>go('profile')}>Complete profile</button></>:<button className="primary" onClick={()=>go('discover')}>Find bursaries</button>}</div>
 <div className="row"><button className="secondary" onClick={()=>go('discover')}>Find bursaries</button><button className="secondary" onClick={()=>go('applications')}>My applications</button><button className="secondary" onClick={()=>go('profile')}>Upload documents</button><button className="secondary" onClick={()=>go('profile')}>Get help</button></div>
 <div className="card"><b>{open.length}</b> bursaries are open to me</div>
 <h2>Recommended</h2>{rec.slice(0,3).map(b=><div key={b.id}>{Card(b)}<p className="muted">Why: {b.place?'Matches your '+b.place.type+(s.profile.level?' and level':''):'Open to everyone'}</p></div>)}
 <h2>Active applications</h2>{s.apps.filter(a=>!DECIDED.includes(a.status)).map(a=><div className="card" key={a.id}>{B.find(b=>b.id===a.bursaryId).title}<br/><span className="badge">{ST[a.status]}</span></div>)}
 <h2>Upcoming deadlines</h2>{dead.map(b=><div className={'card '+(daysLeft(b)<=3?'urgent':'')} key={b.id}>{b.title}: {daysLeft(b)} {t('left')} {daysLeft(b)<=3&&'⚠ Urgent'}</div>)}
 <h2>Recently added</h2>{[...B].reverse().filter(b=>isOpen(b)).slice(0,2).map(b=><div className="card" key={b.id}>{b.title}</div>)}</>}
function Discover({B,s,t,Card}){const [q,setQ]=useState(''),[type,setType]=useState('All'),[lvl,setLvl]=useState(''),[max,setMax]=useState(''),[days,setDays]=useState(''),[sort,setSort]=useState('closing'),[only,setOnly]=useState(true)
 const area=s.profile.area,score=b=>(placeOk(b,area)?2:0)+(b.levels.includes(s.profile.level)?1:0)
 let r=B.filter(b=>(!only||(placeOk(b,area)&&isOpen(b)))&&(type==='All'||b.type===type)&&(!lvl||b.levels.includes(lvl))&&(!max||b.min<=+max)&&(!days||(isOpen(b)&&daysLeft(b)<=+days))&&(b.title+b.org+where(b)).toLowerCase().includes(q.toLowerCase()))
 r.sort((a,b)=>sort==='amount'?b.max-a.max:sort==='new'?b.opens.localeCompare(a.opens):sort==='match'?score(b)-score(a):daysLeft(a)-daysLeft(b))
 const clear=()=>{setQ('');setType('All');setLvl('');setMax('');setDays('')}
 return <><input placeholder="Search name, provider or place" value={q} onChange={e=>setQ(e.target.value)}/>
 <div className="row chips">{['All','Constituency','County','Foundation','Corporate','University','NGO'].map(x=><button key={x} className={'chip '+(type===x?'on':'')} onClick={()=>setType(x)}>{x}</button>)}</div>
 <div className="row"><select value={lvl} onChange={e=>setLvl(e.target.value)}><option value="">Any level</option><option>primary</option><option>secondary</option><option>university</option></select><select value={max} onChange={e=>setMax(e.target.value)}><option value="">Any amount</option><option value="5000">Up to 5,000</option><option value="20000">Up to 20,000</option></select><select value={days} onChange={e=>setDays(e.target.value)}><option value="">Any deadline</option><option value="7">Within 7 days</option><option value="30">Within 30 days</option></select></div>
 <select value={sort} onChange={e=>setSort(e.target.value)}><option value="closing">Closing soon</option><option value="amount">Highest amount</option><option value="new">Newest</option><option value="match">Best match</option></select>
 <label className="card check"><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/> {t('only')}</label><p>{r.length} results</p>
 {r.length?r.map(Card):<div className="card"><p>{t('empty')}</p><button className="secondary" onClick={clear}>{t('clear')}</button></div>}</>}
function Details({b,s,t,act,go,action,err}){const [applying,setApplying]=useState(false);const e=eligibility(b,{...s.profile,docs:s.profile.docs});const nm={area:'Your area',level:'Your education level'}
 if(applying)return <Apply {...{b,s,t,act,go,err}} close={()=>setApplying(false)}/>
 const a=s.apps.find(x=>x.bursaryId===b.id)
 return <><button className="secondary" onClick={()=>go('discover')}>← {t('back')}</button><h1>{b.title}</h1><p>{b.org} · {money(b)} · {where(b)}</p><p>{b.desc}</p><p><b>For:</b> {b.levels.join(', ')} learners</p><p><b>Closes:</b> {b.closes}</p>
 <p><b>Documents:</b> {b.docs.join(', ')}</p><p><b>How it is decided:</b> {b.how}</p><p><b>Contact:</b> {b.contact}</p><p><b>Terms:</b> One application each. Providing false information can disqualify you.</p>
 <div className="card"><b>{t('prelim')}</b><p>✔ {t('meets')}: {e.meets.map(k=>nm[k]).join(', ')||'—'}</p><p>✖ {t('notm')}: {e.not.map(k=>nm[k]).join(', ')||'—'}</p><p>? {t('miss')}: {e.missing.map(k=>nm[k.split(':')[0]]||k.replace('doc:','')).join(', ')||'—'}</p></div>
 {a?action(b):isOpen(b)&&placeOk(b,s.profile.area)?<><button className="primary" onClick={()=>setApplying(true)}>{t('apply')}</button><p>{t('free')}</p></>:action(b)}</>}
function Apply({b,s,t,act,close}){const d=s.drafts[b.id]||{step:1,a:{}},[step,setStep]=useState(d.step),[a,setA]=useState(d.a),[ok,setOk]=useState(false),[done,setDone]=useState(null),[ferr,setFerr]=useState({})
 const set=(k,v)=>{const n={...a,[k]:v};setA(n);api.saveDraft(b.id,{step,a:n})} // autosave
 const to=n=>{setStep(n);api.saveDraft(b.id,{step:n,a})}
 const file=async(doc,f)=>{const bad=validateFile(f);if(bad)return setFerr({...ferr,[doc]:bad==='type'?'Needs a new file: use PDF, JPG or PNG.':'Too big. Maximum 5 MB.'})
  setFerr({...ferr,[doc]:null});const out=s.profile.saver?f:await compress(f);await act(()=>api.updateProfile({docs:{...s.profile.docs,[doc]:{name:out.name,size:out.size}}}))}
 if(done)return <div className="card"><h2>✔ Submitted</h2><p>Your reference: <b>{done}</b></p><p>What happens next: the provider reviews your application. We will tell you here when anything changes.</p><button className="primary" onClick={close}>Done</button></div>
 const Field=(k,label,extra)=><><label>{label}</label><input value={a[k]||''} onChange={e=>set(k,e.target.value)} {...extra}/></>
 return <div><button className="secondary" onClick={close}>← {t('back')}</button><h2>{b.title}</h2><p className="muted">{step<4?`Step ${step} of 3`:'Review'}</p><div className="bar"><i style={{width:Math.min(step,3)*33+'%'}}/></div><p>{t('free')}</p>
 {step===1&&<>{Field('school','School or college name')}{Field('year','Class or year')}</>}
 {step===2&&<><label>Household income (we ask so reviewers understand need. It never decides alone.)</label><select value={a.income||''} onChange={e=>set('income',e.target.value)}><option value="">Prefer not to say</option><option>Low</option><option>Middle</option><option>Higher</option></select>
  <label>Are you an orphan? (This helps reviewers understand your situation.)</label><select value={a.orphan||''} onChange={e=>set('orphan',e.target.value)}><option value="">Prefer not to say</option><option>Yes</option><option>No</option></select>
  <label>{b.q}</label><textarea rows="4" value={a.why||''} onChange={e=>set('why',e.target.value)}/></>}
 {step===3&&<><p>{t('types')}</p>{b.docs.map(doc=>{const f=s.profile.docs[doc];return <div className="card" key={doc}><b>{doc}</b> <span className="badge">{f?'✔ Uploaded: '+f.name:'Required'}</span>{ferr[doc]&&<p className="err">{ferr[doc]}</p>}<input type="file" accept="application/pdf,image/jpeg,image/png" capture={undefined} onChange={e=>e.target.files[0]&&file(doc,e.target.files[0])}/><small>{f?'Reused across applications. Replace any time before a decision.':'Camera, gallery or PDF'}</small></div>})}</>}
 {step===4&&<div className="card"><h3>Review</h3>{[['School',a.school,1],['Year',a.year,1],['Income',a.income,2],['Why',a.why,2]].map(([k,v,n])=><p key={k}>{k}: {v||'—'} <a href="#" onClick={e=>{e.preventDefault();to(n)}}>Edit</a></p>)}<p>Documents: {b.docs.filter(x=>s.profile.docs[x]).length}/{b.docs.length} <a href="#" onClick={e=>{e.preventDefault();to(3)}}>Edit</a></p>
  <label className="check"><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}/> {t('decl')}</label></div>}
 <div className="row">{step>1&&<button className="secondary" onClick={()=>to(step-1)}>{t('back')}</button>}{step<4?<button className="primary" disabled={step===1&&!(a.school&&a.year)} onClick={()=>to(step+1)}>{t('cont')}</button>:<button className="primary" disabled={!ok||b.docs.some(x=>!s.profile.docs[x])} onClick={async()=>{if(await act(()=>api.submitApplication(b.id,a)))setDone(api.load().apps.at(-1).ref)}}>{t('submit')}</button>}</div></div>}
function Apps({s,B,t,act,go,view,Card,err}){const [tb,setTb]=useState('Active'),[conf,setConf]=useState(false)
 if(view?.v==='app'&&s.apps.some(x=>x.id===view.id)){const a=s.apps.find(x=>x.id===view.id),b=B.find(x=>x.id===a.bursaryId)
  return <><button className="secondary" onClick={()=>go('applications')}>← {t('back')}</button><h2>{b.title}</h2><p>{a.ref} · <span className="badge">{ST[a.status]}</span></p>
  {a.status==='more_info_needed'&&<div className="card urgent"><b>⚠ Action needed:</b> please send the information the provider asked for.<button className="primary" onClick={()=>go('discover',{v:'bursary',id:b.id})}>Update my application</button></div>}
  {a.status==='unsuccessful'&&<div className="card"><p>{t('sad')}</p>{B.filter(x=>isOpen(x)&&placeOk(x,s.profile.area)&&x.id!==b.id).slice(0,2).map(Card)}</div>}
  <h3>Timeline</h3>{a.history.map((h,i)=><p key={i}>{ST[h.status]} · {new Date(h.at).toLocaleString()}</p>)}<h3>Messages</h3>{a.messages.length?a.messages.map((m,i)=><p key={i}>{m}</p>):<p className="muted">No messages yet.</p>}
  {!DECIDED.includes(a.status)&&(conf?<div className="card"><p>Withdraw this application? You cannot undo this.</p><button className="secondary" onClick={()=>act(()=>api.withdraw(a.ref))}>Yes, withdraw</button><p/><button className="primary" onClick={()=>setConf(false)}>No, keep it</button></div>:<button className="secondary" onClick={()=>setConf(true)}>{t('withdraw')}</button>)}</>}
 const L=tb==='Active'?s.apps.filter(a=>!DECIDED.includes(a.status)):tb==='Decisions'?s.apps.filter(a=>DECIDED.includes(a.status)):[]
 return <><h1>{t('applications')}</h1><div className="row chips">{['Active','Decisions','Drafts'].map(x=><button key={x} className={'chip '+(tb===x?'on':'')} onClick={()=>setTb(x)}>{x}</button>)}</div>
 {tb==='Drafts'?Object.keys(s.drafts).map(id=>{const b=B.find(x=>x.id===id);return <div className="card" key={id}>{b.title}<button className="primary" onClick={()=>go('discover',{v:'bursary',id})}>Continue</button></div>}):L.map(a=><div className="card" key={a.id} onClick={()=>go('applications',{v:'app',id:a.id})}><b>{B.find(b=>b.id===a.bursaryId).title}</b><br/>{a.ref}<br/><span className="badge">{ST[a.status]}</span><br/><small>Last changed {new Date(a.history.at(-1).at).toLocaleDateString()}</small></div>)}
 {!L.length&&tb!=='Drafts'&&<div className="card">Nothing here yet. <button className="primary" onClick={()=>go('discover')}>Find bursaries</button></div>}</>}
function Notifs({s,t,act,go}){const days=[...new Set(s.notifs.map(n=>n.at.slice(0,10)))]
 return <><button className="secondary" onClick={()=>go('profile')}>← {t('back')}</button><h2>{t('notifs')}</h2><button className="secondary" onClick={()=>act(()=>api.markAllRead())}>{t('markall')}</button>
 {days.map(d=><div key={d}><h3>{d}</h3>{s.notifs.filter(n=>n.at.startsWith(d)).map(n=><div className="card" key={n.id} onClick={async()=>{await act(()=>api.markRead(n.id));n.go&&go('applications',{v:n.go.view,id:n.go.id})}}>{!n.read&&'● '}{n.text}</div>)}</div>)}{!s.notifs.length&&<p>No notifications yet.</p>}</>}
function Profile({s,t,act,go,err,home}){const p=s.profile,pick=q=>({name:q.name||'',phone:q.phone||'',school:q.school||'',level:q.level||'',year:q.year||'',idNo:q.idNo||'',guardian:q.guardian||'',saver:!!q.saver,notify:q.notify})
 const [d,setD]=useState(()=>pick(p)),[saved,setSaved]=useState(false),[req,setReq]=useState(false),[area,setArea]=useState(''),[why,setWhy]=useState('')
 const dirty=JSON.stringify(d)!==JSON.stringify(pick(p)),pct=completion(d),ch=patch=>{setD({...d,...patch});setSaved(false)}
 const F=(k,label,extra={})=><><label htmlFor={'f-'+k}>{label}</label><input id={'f-'+k} value={d[k]} onChange={e=>ch({[k]:e.target.value})} {...extra}/></>
 const save=async ev=>{ev.preventDefault();if(await act(()=>api.updateProfile(d)))setSaved(true)}
 return <form onSubmit={save}><h1>{t('profile')}</h1><div className="card"><div className="bar"><i style={{width:pct+'%'}}/></div><p>{pct}% complete</p></div>
 {F('name','Full name')}{F('phone','Phone (for later)',{inputMode:'tel'})}{F('school','School or college')}<label htmlFor="f-level">Education level</label><select id="f-level" value={d.level} onChange={e=>ch({level:e.target.value})}><option value="">Choose</option><option>primary</option><option>secondary</option><option>university</option></select>
 {F('year','Class or year')}{F('idNo','ID or birth certificate number')}{F('guardian','Guardian name and phone')}
 <label className="check"><input type="checkbox" checked={d.saver} onChange={e=>ch({saver:e.target.checked})}/> Data-saving mode (skips image compression and photos)</label>
 {['status','deadline','match'].map(k=><label key={k} className="check"><input type="checkbox" checked={d.notify[k]} onChange={e=>ch({notify:{...d.notify,[k]:e.target.checked}})}/> Notify me: {k}</label>)}
 <button className="primary" type="submit" disabled={!dirty}>Save profile</button>{dirty&&<p className="muted">You have unsaved changes.</p>}
 {saved&&!dirty&&<div className="card accent" role="status"><b>Profile saved.</b>{pct===100?<><p>Your profile is complete. You are ready to apply.</p><button type="button" className="primary" onClick={()=>go('discover')}>Find bursaries</button></>:<p>Your profile is {pct}% complete. Fill in the rest to apply faster.</p>}</div>}
 <div className="card"><small>Your area</small><p><b>{p.area.county} / {p.area.constituency} / {p.area.ward}</b></p><p className="muted">This is locked. To change it, visit your ward or constituency office and an administrator must approve it.</p>{s.areaReq?<p className="badge">Request pending</p>:req?<><label htmlFor="na">New ward</label><input id="na" value={area} onChange={e=>setArea(e.target.value)}/><label htmlFor="nr">Reason</label><input id="nr" value={why} onChange={e=>setWhy(e.target.value)}/><button type="button" className="primary" disabled={!area||!why} onClick={()=>act(()=>api.requestAreaChange(area,why))}>Send request</button></>:<button type="button" className="secondary" onClick={()=>setReq(true)}>Request an area change</button>}</div>
 <div className="card"><b>Help</b><p>Applying is always free. BursaLink never asks for money. If someone asks you to pay, report it.</p><button type="button" className="secondary" onClick={()=>alert('Thank you. Reporting needs your backend.')}>Report a suspicious request</button></div>
 <button type="button" className="secondary" onClick={()=>act(()=>api.logout()).then(home)}>Log out</button><p/><button type="button" className="secondary" onClick={()=>confirm('Delete your account and data?')&&act(()=>api.deleteAccount()).then(home)}>Delete account</button>{err&&<p className="err">{err}</p>}</form>}
