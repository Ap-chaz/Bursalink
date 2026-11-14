import {useMemo,useState} from 'react'
import './landing.css'
import {Header,Footer} from './Shell.jsx'

// Simple stroke icons (24x24) so the page needs no icon library.
const P={
 search:'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.3-4.3',
 school:'M3 9l9-5 9 5-9 5-9-5zm4 3v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4M21 9v6',
 uni:'M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18',
 pin:'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21zm0-8.500a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
 doc:'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
 clock:'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-12v4l3 2M9 2h6',
 bell:'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
 heart:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z',
 lock:'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
 user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
 globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.500 2.500 3.500 5.500 3.500 9S14.500 18.500 12 21c-2.500-2.500-3.500-5.500-3.500-9S9.500 5.500 12 3z',
 build:'M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 11h2M14 11h2',
 flag:'M5 21V4m0 0h12l-2 4 2 4H5',
 hand:'M12 21c-4 0-7-2.500-7-6V9l3 1V5l3 1V4l3 1 3 1v9c0 3.500-2 6-5 6z',
 people:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.500 2.500 0 1 0 0-5M3 20a6 6 0 0 1 12 0M16 14a5 5 0 0 1 5 6'
}
const Ic=({n,s=32})=><svg className="ic" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]}/></svg>

export default function Landing({lang,toggle,start}){
 const x=(a,b)=>lang==='sw'?b:a
 const [q,setQ]=useState(''),[menu,setMenu]=useState(false)

 const nav=[['#top',x('Home','Nyumbani')],['#providers',x('National','Kitaifa')],['#providers',x('Counties','Kaunti')],['#help',x('Help & Support','Msaada')]]

 // The eight quick shortcuts under the search bar (like eCitizen's service row).
 const quick=[
  ['school',x('Secondary school bursaries','Bursari za sekondari')],
  ['uni',x('University & college funding','Ufadhili wa chuo')],
  ['pin',x('Bursaries for my ward','Bursari za wadi yangu')],
  ['build',x('County government funds','Mifuko ya kaunti')],
  ['flag',x('Constituency (CDF) bursaries','Bursari za eneobunge')],
  ['hand',x('Foundations & NGOs','Wakfu na NGO')],
  ['clock',x('Closing this month','Zinazofungwa mwezi huu')],
  ['doc',x('Track my application','Fuatilia ombi langu')]]

 const feats=[
  ['lock',x('One log-in, every bursary','Kuingia mara moja, bursari zote'),x('All you need is an email address. Sign in with a one-time code, with no password to remember.','Unahitaji barua pepe tu. Ingia kwa msimbo wa mara moja, bila nenosiri.')],
  ['user',x("A single student profile",'Wasifu mmoja wa mwanafunzi'),x('Your ward, school level and documents are saved once and reused for every application you make.','Wadi yako, kiwango cha masomo na hati huhifadhiwa mara moja na kutumika kwa kila ombi.')],
  ['bell',x('Convenient access on any phone','Rahisi kwa simu yoyote'),x('Apply, save drafts, get status updates and see every decision in one place. Applying is always free.','Omba, hifadhi rasimu, pata taarifa za hali na uone kila uamuzi mahali pamoja. Kuomba ni bure daima.')]]

 const providers=[
  [x('Constituency funds','Mifuko ya eneobunge'),x('Bursaries for learners in a single constituency, reviewed by the local fund committee.','Bursari kwa wanafunzi wa eneobunge moja, zinazokaguliwa na kamati ya mfuko.'),'flag'],
  [x('County governments','Serikali za kaunti'),x('County bursaries open to every ward, with a full record of each decision.','Bursari za kaunti kwa kila wadi, zikiwa na kumbukumbu ya kila uamuzi.'),'build'],
  [x('Ward development funds','Mifuko ya wadi'),x('Smaller grants for primary and secondary learners who live in the ward.','Ruzuku ndogo kwa wanafunzi wa msingi na sekondari wanaoishi wadini.'),'pin'],
  [x('Foundations','Wakfu'),x('Scholarships open to all Kenyan students or focused on one place or level.','Ufadhili kwa wanafunzi wote wa Kenya au unaolenga eneo au kiwango kimoja.'),'hand'],
  [x('Corporate programmes','Programu za makampuni'),x('Company grants for university and college students with clear closing dates.','Ruzuku za makampuni kwa wanafunzi wa chuo, zenye tarehe wazi za kufunga.'),'uni'],
  [x('NGOs and community groups','NGO na vikundi vya jamii'),x('Support for learners from families that need it most, in your own community.','Msaada kwa wanafunzi kutoka familia zinazohitaji zaidi, katika jamii yako.'),'people']]
 const shown=useMemo(()=>providers.filter(p=>(p[0]+p[1]).toLowerCase().includes(q.trim().toLowerCase())),[q,lang])

 // Dusk campus skyline drawn in SVG, standing in for the harbour photo in the reference.
 const hero=<svg className="herobg" viewBox="0 0 1600 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c4a7a"/><stop offset=".55" stopColor="#7d8fb4"/><stop offset="1" stopColor="#e9a46e"/></linearGradient>
  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a3a3a"/><stop offset="1" stopColor="#0c1f24"/></linearGradient></defs>
  <rect width="1600" height="640" fill="url(#sky)"/>
  <g fill="#34507a" opacity=".55"><rect x="60" y="330" width="90" height="180"/><rect x="170" y="290" width="70" height="220"/><rect x="1250" y="300" width="100" height="210"/><rect x="1370" y="350" width="80" height="160"/><rect x="1470" y="310" width="90" height="200"/></g>
  <g fill="#10272e">
   <path d="M560 520V360l120-70 120 70v160z"/><path d="M680 290V220l0-30"/><rect x="672" y="200" width="16" height="92"/><path d="M640 220h80l-40-36z"/>
   <rect x="440" y="410" width="130" height="110"/><rect x="800" y="410" width="150" height="110"/>
   <path d="M0 520h1600v120H0z" fill="url(#gr)"/></g>
  <g fill="#ffd98a" opacity=".9">{[[600,400],[640,400],[720,400],[760,400],[600,450],[640,450],[720,450],[760,450],[460,440],[500,440],[830,440],[880,440],[920,440]].map(([a,b],i)=><rect key={i} x={a} y={b} width="14" height="20" rx="2"/>)}</g>
 </svg>

 const go=e=>{e.preventDefault();start()}

 return <div className="lp" id="top">
  <Header {...{lang,toggle,start}} route="/"/>

  <section className="hero">{hero}<div className="shade"/>
   <div className="heroin">
    <h1>{x('Kenya bursaries simplified','Bursari za Kenya zimerahisishwa')}<br/>{x('All your applications unified','Maombi yako yote mahali pamoja')}</h1>
    <div className="panel" id="search">
     <form className="searchbar" role="search" onSubmit={go}><Ic n="search" s={22}/>
      <input value={q} onChange={e=>setQ(e.target.value)} aria-label={x('Search bursaries','Tafuta bursari')} placeholder={x('Type name of bursary, provider, county, ward etc...','Andika jina la bursari, mtoaji, kaunti, wadi n.k...')}/></form>
     <ul className="quick">{quick.map(([i,l])=><li key={l}><button onClick={start}><Ic n={i} s={34}/><span>{l}</span></button></li>)}</ul>
    </div></div></section>

  <section className="banner"><div className="bannerin">
   <p>{x('Over ','Zaidi ya ')}<b>{x('1,400 wards','wadi 1,400')}</b>{x(' across all ',' katika kaunti zote ')}<b>{x('47 counties','47')}</b>{x(', with bursaries from constituencies, counties, foundations and companies.','; bursari kutoka maeneobunge, kaunti, wakfu na makampuni.')}</p></div>
   <div className="bannerbar"><div className="bbin"><span>{x('Get started on BursaLink today','Anza kutumia BursaLink leo')}</span><div><button className="signin sm" onClick={()=>start('signin')}>{x('Sign in','Ingia')}</button><button className="reg sm" onClick={()=>start('register')}>{x('Register','Jisajili')}</button></div></div></div>
  </section>

  <section className="feats" id="help"><div className="featin">{feats.map(([i,h,t])=><div key={h}><Ic n={i} s={46}/><h3>{h}</h3><p>{t}</p></div>)}</div></section>

  <section className="provs" id="providers"><div className="provin">
   <h2>{x('Who offers bursaries','Wanaotoa bursari')}</h2>
   <div className="pgrid">{shown.map(([h,t,i])=><article className="pcard" key={h}><span className="pic"><Ic n={i} s={26}/></span><div><h3>{h}</h3><p>{t}</p></div></article>)}
    {!shown.length&&<p className="none">{x('Nothing matches. Clear the search box to see everyone.','Hakuna kinacholingana. Futa kisanduku cha kutafuta.')}</p>}</div>
  </div></section>

  <Footer lang={lang}/>
 </div>}
