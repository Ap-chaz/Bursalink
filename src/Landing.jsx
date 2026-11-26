// Public Landing page for BursaLink — Kenya's unified bursary & scholarship portal.
import {useState,useMemo} from 'react'
import './landing.css'
import {Header,Footer} from './Shell.jsx'
import * as api from './lib/api.js'

// Clean stroke icons (24x24) for lightweight fast loading on all mobile networks.
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
 people:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.500 2.500 0 1 0 0-5M3 20a6 6 0 0 1 12 0M16 14a5 5 0 0 1 5 6',
 check:'M20 6L9 17l-5-5'
}
const Ic=({n,s=24})=><svg className="ic" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]}/></svg>

export default function Landing({lang,toggle,start}){
 const x=(a,b)=>lang==='sw'?b:a
 const [q,setQ]=useState('')
 const [trackingOpen,setTrackingOpen]=useState(false)
 const [trackRef,setTrackRef]=useState('')
 const [trackData,setTrackData]=useState(null)
 const [trackErr,setTrackErr]=useState('')
 const [trackLoading,setTrackLoading]=useState(false)

 // Smart Filter Categories
 const filterChips=[
  ['school', x('High School Bursaries','Bursari za Sekondari'), 'school'],
  ['uni', x('University & TVET Funds','Vyuo Vikuu na TVET'), 'uni'],
  ['pin', x('My Ward & NG-CDF','Wadi Yangu & NG-CDF'), 'pin'],
  ['clock', x('Closing Soon','Zinazofungwa Karibuni'), 'clock'],
  ['hand', x('Corporate & Foundations','Wakfu & Mashirika'), 'hand'],
  ['doc', x('Track Application Ref','Fuatilia Ombi kwa Nambari'), 'doc']
 ]

 // Featured Provider Opportunities
 const opportunities=[
  {
   title: x('NG-CDF Constituency Education Funds','Mifuko ya Elimu ya Maeneobunge (NG-CDF)'),
   org: x('290 National Constituencies','Maeneobunge Yote 290 Nchini'),
   desc: x('Direct allocations voted by Parliament for secondary, college, and vocational learners residing in your registered constituency.','Ufadhili wa bunge kwa wanafunzi wa sekondari, vyuo na ufundi katika eneobunge lako.'),
   type: x('Constituency','Eneobunge'),
   amount: 'KES 5,000 – 30,000',
   icon: 'flag'
  },
  {
   title: x('County Government Executive Bursaries','Bursari za Serikali za Kaunti'),
   org: x('47 County Education Departments','Idara za Elimu za Kaunti 47'),
   desc: x('County-wide bursary schemes open to vulnerable, needy, and gifted students across all wards with published award records.','Bursari za kaunti kwa wanafunzi wanaohitaji katika wadi zote zenye orodha wazi ya waliopata.'),
   type: x('County','Kaunti'),
   amount: 'KES 10,000 – 50,000',
   icon: 'build'
  },
  {
   title: x('Equity Group Foundation — Wings to Fly','Wakfu wa Equity — Wings to Fly'),
   org: 'Equity Group Foundation & Mastercard',
   desc: x('Comprehensive secondary school scholarships covering tuition, boarding, books, uniform, and personal mentorship.','Ufadhili kamili wa masomo ya sekondari unaogharamia karo, malazi, sare na ushauri.'),
   type: x('Foundation','Wakfu'),
   amount: x('100% Comprehensive','Ufadhili Kamili 100%'),
   icon: 'school'
  },
  {
   title: x('KCB Foundation — 2Jiajiri & Secondary','Wakfu wa KCB — 2Jiajiri na Sekondari'),
   org: 'KCB Foundation',
   desc: x('Targeted funding for bright secondary students and technical vocational training (TVET) graduates across Kenya.','Ufadhili kwa wanafunzi hodari wa sekondari na mafunzo ya ufundi stadi (TVET) nchini.'),
   type: x('Corporate','Shirika'),
   amount: 'KES 25,000 – 70,000',
   icon: 'uni'
  },
  {
   title: x('Ward Development Education Grants','Mifuko ya Maendeleo ya Wadi'),
   org: x('Ward Offices & MCAs','Ofisi za Wadi na Wawakilishi (MCA)'),
   desc: x('Micro-grants dedicated to supporting orphaned and highly vulnerable children within the local ward boundary.','Ruzuku ndogo kusaidia watoto mayatima na familia zenye mahitaji maalum wadini.'),
   type: x('Ward','Wadi'),
   amount: 'KES 3,000 – 15,000',
   icon: 'pin'
  },
  {
   title: x('Co-operative Bank & Family Bank Foundations','Wakfu wa Co-operative & Family Bank'),
   org: x('Banking Sector Foundations','Wakfu za Sekta ya Kibenki'),
   desc: x('Four-year full high school and tertiary tuition scholarships for academically gifted but financially strained learners.','Ufadhili wa miaka minne wa karo ya shule za upili na vyuo kwa wanafunzi wenye alama za juu.'),
   type: x('Corporate','Shirika'),
   amount: x('Full Tuition','Karo Yote'),
   icon: 'hand'
  }
 ]

 const filteredOpps=useMemo(()=>{
  if(!q.trim())return opportunities
  const query=q.toLowerCase()
  return opportunities.filter(o=>
   o.title.toLowerCase().includes(query) ||
   o.org.toLowerCase().includes(query) ||
   o.desc.toLowerCase().includes(query) ||
   o.type.toLowerCase().includes(query)
  )
 },[q,lang])

 const handleChipClick=(key)=>{
  if(key==='doc'){
   setTrackingOpen(true)
   setTrackErr('')
  } else {
   start()
  }
 }

 const submitTrack=async(e)=>{
  e.preventDefault()
  if(!trackRef.trim())return
  setTrackLoading(true)
  setTrackErr('')
  setTrackData(null)
  try{
   const res=await api.trackApplication(trackRef.trim())
   setTrackData(res)
  }catch(err){
   setTrackErr(err.message||'No application found matching this reference.')
  }finally{
   setTrackLoading(false)
  }
 }

 return <div className="lp" id="top">
  <Header {...{lang,toggle,start}} route="/" onTrack={()=>setTrackingOpen(true)}/>

  {/* Hero Section — Distinct Education Funding Identity */}
  <section className="hero">
   <div className="hero-mesh" aria-hidden="true"/>
   <div className="heroin">
    <div className="hero-badge">
     <span className="live-dot"/>
     <span>{x('Kenya’s Official Bursary & Scholarship Gateway','Mlango Rasmi wa Bursari na Ufadhili Kenya')}</span>
    </div>

    <h1 className="hero-title">
     {x('Never Miss Another','Usikose Tena')} <br/>
     <span className="grad-txt">{x('Bursary Deadline.','Tarehe ya Mwisho ya Bursari.')}</span>
    </h1>

    <p className="hero-sub">
     {x(
      'Discover, match, and apply for verified NG-CDF, County Government, and Foundation scholarships across all 1,450 wards — zero paperwork, zero fees, 100% transparent.',
      'Tafuta, linganisha, na utume maombi ya bursari halisi za NG-CDF, Kaunti, na mashirika binafsi katika wadi zote 1,450 — bila karatasi, bila malipo, na kwa uwazi 100%.'
     )}
    </p>

    {/* Search Hub */}
    <div className="search-hub" id="search">
     <form className="hub-bar" role="search" onSubmit={e=>{e.preventDefault();start()}}>
      <div className="hub-search-icon"><Ic n="search" s={22}/></div>
      <input
       value={q}
       onChange={e=>setQ(e.target.value)}
       aria-label={x('Search bursaries','Tafuta bursari')}
       placeholder={x('Search by bursary name, constituency, county, or ward (e.g. Westlands, Secondary, Equity)...','Tafuta kwa jina la bursari, kaunti, eneobunge, au wadi (mf. Westlands, Sekondari, Equity)...')}
      />
      <button type="submit" className="hub-submit-btn">{x('Explore Funds','Tafuta Mifuko')}</button>
     </form>

     {/* Filter Chips */}
     <div className="hub-chips">
      <span className="hub-chips-label">{x('Popular Categories:','Aina Maarufu:')}</span>
      <div className="chips-list">
       {filterChips.map(([k, lbl, icon])=>(
        <button key={k} className="chip-item" onClick={()=>handleChipClick(k)}>
         <Ic n={icon} s={16}/>
         <span>{lbl}</span>
        </button>
       ))}
      </div>
     </div>
    </div>

    {/* Transparent Live Impact Metrics */}
    <div className="hero-stats">
     <div className="stat-box">
      <b>1,450</b>
      <span>{x('Wards Covered','Wadi Zote 1,450')}</span>
     </div>
     <div className="stat-sep"/>
     <div className="stat-box">
      <b>290</b>
      <span>{x('Constituencies','Maeneobunge 290')}</span>
     </div>
     <div className="stat-sep"/>
     <div className="stat-box">
      <b>47</b>
      <span>{x('Counties Mapped','Kaunti Zote 47')}</span>
     </div>
     <div className="stat-sep"/>
     <div className="stat-box">
      <b>KES 0</b>
      <span>{x('100% Free Application','Maombi Bure 100%')}</span>
     </div>
    </div>
   </div>
  </section>

  {/* Live Application Tracker Modal */}
  {trackingOpen && (
   <div className="tracker-overlay" onClick={()=>setTrackingOpen(false)}>
    <div className="tracker-modal" onClick={e=>e.stopPropagation()}>
     <div className="tracker-head">
      <div>
       <span className="badge-tag">{x('Live Status','Hali ya Moja kwa Moja')}</span>
       <h2 style={{margin:'6px 0 0',fontSize:'20px',color:'#0f172a'}}>{x('Track Application Status','Fuatilia Hali ya Ombi Lako')}</h2>
      </div>
      <button className="tracker-close" onClick={()=>setTrackingOpen(false)} aria-label="Close">✕</button>
     </div>
     <p style={{margin:'0 0 16px',fontSize:'14px',color:'#64748b'}}>
      {x('Enter the reference number from your confirmation SMS or email (e.g. BL-2026-NBI-4829).','Weka nambari ya kumbukumbu uliyopokea kwenye SMS au barua pepe.')}
     </p>

     <form onSubmit={submitTrack} style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
      <input
       style={{
        flex:1,height:'48px',padding:'0 16px',borderRadius:'12px',border:'1px solid #cbd5e1',
        fontFamily:'monospace',fontSize:'15px',color:'#1e293b'
       }}
       placeholder="e.g. BL-2026-NBI-4829"
       value={trackRef}
       onChange={e=>setTrackRef(e.target.value)}
      />
      <button type="submit" className="cta-btn sm" disabled={trackLoading}>
       {trackLoading ? x('Searching...','Inatafuta...') : x('Track','Fuatilia')}
      </button>
     </form>

     {trackErr && (
      <div style={{background:'#fee2e2',color:'#b91c1c',padding:'12px 16px',borderRadius:'12px',fontSize:'14px',marginBottom:'16px'}}>
       ⚠ {trackErr}
      </div>
     )}

     {trackData && (
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'clamp(14px, 3vw, 20px)'}}>
       <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start',gap:'10px',marginBottom:'12px'}}>
        <div>
         <span style={{fontSize:'12px',color:'#64748b',fontWeight:'bold',letterSpacing:'0.05em'}}>{x('REFERENCE CODE','NAMBARI YA KUMBUKUMBU')}</span>
         <h3 style={{fontSize:'18px',fontFamily:'monospace',margin:'4px 0 0',color:'#0f172a'}}>{trackData.ref}</h3>
        </div>
        <span style={{
         background: trackData.status === 'approved' ? '#dcfce7' : trackData.status === 'under_review' ? '#fef9c3' : '#e0f2fe',
         color: trackData.status === 'approved' ? '#15803d' : trackData.status === 'under_review' ? '#854d0e' : '#0369a1',
         padding:'6px 14px',borderRadius:'999px',fontSize:'13px',fontWeight:'600'
        }}>
         {trackData.statusLabel}
        </span>
       </div>

       <div style={{borderTop:'1px solid #e2e8f0',paddingTop:'12px',marginBottom:'14px'}}>
        <p style={{margin:'0 0 4px',fontWeight:'600',color:'#1e293b'}}>{trackData.bursaryTitle}</p>
        <p style={{margin:0,fontSize:'13px',color:'#64748b'}}>{trackData.bursaryOrg}</p>
       </div>

       {trackData.history && trackData.history.length > 0 && (
        <div style={{borderTop:'1px solid #e2e8f0',paddingTop:'12px'}}>
         <h4 style={{fontSize:'13px',color:'#475569',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 10px'}}>
          {x('Status History Timeline','Msururu wa Mabadiliko ya Hali')}
         </h4>
         <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {trackData.history.map((h, idx) => (
           <div key={idx} style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:'6px',fontSize:'13px',background:'#fff',padding:'8px 12px',borderRadius:'8px',border:'1px solid #f1f5f9'}}>
            <div style={{minWidth:0,flex:'1 1 180px'}}>
             <b style={{color:'#1e293b'}}>{h.statusLabel}</b>
             {h.note && <span style={{color:'#64748b',marginLeft:'6px',wordBreak:'break-word'}}>· {h.note}</span>}
            </div>
            <span style={{color:'#94a3b8',fontSize:'12px',whiteSpace:'nowrap'}}>{new Date(h.at).toLocaleDateString()}</span>
           </div>
          ))}
         </div>
        </div>
       )}
      </div>
     )}
    </div>
   </div>
  )}

  {/* Replaces eCitizen's green bar with Student Journey Flow */}
  <section className="workflow-sec" id="how-it-works">
   <div className="sec-in">
    <div className="sec-title-wrap">
     <span className="badge-tag">{x('3 Easy Steps','Hatua 3 Rahisi')}</span>
     <h2 className="sec-h2">{x('How BursaLink Works for Students & Parents','Jinsi BursaLink Inavyorahisisha Maombi ya Elimu')}</h2>
     <p className="sec-p">{x('No more printing physical forms, traveling to constituency offices, or losing track of award lists.','Hakuna tena kuchapisha fomu, kusafiri hadi ofisi za eneobunge, au kupoteza taarifa za orodha.')}</p>
    </div>

    <div className="steps-container">
     <div className="workflow-card">
      <div className="wf-step-num">01</div>
      <div className="wf-icon"><Ic n="user" s={28}/></div>
      <h3>{x('Create One Verified Student Profile','Weka Wasifu Wako Mara Moja')}</h3>
      <p>{x('Select your County, Constituency, and Ward. Upload your admission slip and fee structure once — safely stored in your secure vault.','Chagua Kaunti, Eneobunge, na Wadi yako. Hifadhi hati zako za shule kwa usalama.')}</p>
     </div>

     <div className="workflow-card">
      <div className="wf-step-num">02</div>
      <div className="wf-icon"><Ic n="school" s={28}/></div>
      <h3>{x('Automatic Ward & Level Match','Ulinganishaji wa Kiotomatiki')}</h3>
      <p>{x('BursaLink automatically screens your ward and level against active NG-CDF and County rules so you only apply where you qualify.','BursaLink inakuchagulia mifuko unayostahili kulingana na sheria za wadi na kiwango chako cha masomo.')}</p>
     </div>

     <div className="workflow-card">
      <div className="wf-step-num">03</div>
      <div className="wf-icon"><Ic n="doc" s={28}/></div>
      <h3>{x('Direct Online Tracking & Cheques','Ufuatiliaji wa Moja kwa Moja')}</h3>
      <p>{x('Follow your reference number in real time from submission to fund committee approval. Get SMS alerts when shortlists are announced.','Fuatilia ombi lako mtandaoni kuanzia kupokelewa hadi kuidhinishwa na kupata ujumbe wa SMS.')}</p>
     </div>
    </div>

    <div className="workflow-action-box">
     <div>
      <h4>{x('Start Your Free Application Today','Anza Ombi Lako Bila Malipo Leo')}</h4>
      <p>{x('Over 20+ national, county, and constituency funding windows are currently open.','Zaidi ya mifuko 20 ya kitaifa, kaunti na maeneobunge iko wazi sasa.')}</p>
     </div>
     <div className="wf-actions">
      <button className="cta-btn" onClick={()=>start('register')}>{x('Register as Student →','Jisajili kama Mwanafunzi →')}</button>
      <button className="cta-btn secondary" onClick={()=>setTrackingOpen(true)}>{x('Track Application','Fuatilia Ombi')}</button>
     </div>
    </div>
   </div>
  </section>

  {/* Unique Student Problem-Solving Value Props (Replaces eCitizen copy) */}
  <section className="benefits-sec" id="benefits">
   <div className="sec-in">
    <div className="sec-title-wrap">
     <span className="badge-tag">{x('Why BursaLink','Kwa Nini BursaLink')}</span>
     <h2 className="sec-h2">{x('Fair, Fast & Transparent Education Access','Elimu ya Haki, Haraka na Wazi')}</h2>
     <p className="sec-p">{x('Designed directly with Kenyan learners, parents, and bursary committees in mind.','Imebuniwa kusaidia wanafunzi, wazazi na kamati za bursari nchini Kenya.')}</p>
    </div>

    <div className="benefits-grid">
     <div className="benefit-card">
      <div className="b-icon-wrap"><Ic n="lock" s={26}/></div>
      <h3>{x('No More Paper Chasing','Hakuna Tena Kusubiri Karatasi')}</h3>
      <p>{x('Apply online from any smartphone. Never stand in long lines outside CDF offices or chief camps just to collect physical paper forms.','Omba mtandaoni kupitia simu yoyote. Hakuna haja ya kusimama kwenye foleni ofisi za CDF au chifu.')}</p>
     </div>

     <div className="benefit-card">
      <div className="b-icon-wrap"><Ic n="pin" s={26}/></div>
      <h3>{x('IEBC Ward-Level Precision','Usahihi wa Wadi za IEBC')}</h3>
      <p>{x('Integrated with official boundary data across all 1,450 wards. Avoid disqualification due to submitting to the wrong constituency office.','Imeunganishwa na wadi zote 1,450 ili kuhakikisha unatuma ombi mahali panapostahili.')}</p>
     </div>

     <div className="benefit-card">
      <div className="b-icon-wrap"><Ic n="bell" s={26}/></div>
      <h3>{x('Deadline Reminders & SMS','Kumbusho za Tarehe za Mwisho')}</h3>
      <p>{x('Receive instant notifications before application windows close, so you never miss funding for tuition, books, or boarding.','Pata arifa kabla ya dirisha la maombi kufungwa ili usikose ufadhili wa karo au malazi.')}</p>
     </div>

     <div className="benefit-card">
      <div className="b-icon-wrap"><Ic n="heart" s={26}/></div>
      <h3>{x('100% Free & Anti-Fraud Guarantee','Bure 100% & Ulinzi Dhidi ya Ulaghai')}</h3>
      <p>{x('BursaLink is completely free. We adhere to the Kenya Data Protection Act 2019 (ODPC). Never pay brokers or intermediaries.','Kutumia BursaLink ni bure kabisa. Inalindwa kisheria (ODPC). Usimlipe mtu yeyote fedha ili kupata bursari.')}</p>
     </div>
    </div>
   </div>
  </section>

  {/* Live Opportunities & Verified Funds (Replaces eCitizen agency grid) */}
  <section className="opps-sec" id="opportunities">
   <div className="sec-in">
    <div className="sec-title-wrap">
     <span className="badge-tag">{x('Verified Partners','Wafadhili Walioidhinishwa')}</span>
     <h2 className="sec-h2">{x('Explore Funding Programs Across Kenya','Chunguza Programu za Bursari')}</h2>
     <p className="sec-p">{x('From parliamentary constituency funds to corporate foundations and county allocations.','Kuanzia mifuko ya maeneobunge hadi mashirika ya kitaifa na kaunti.')}</p>
    </div>

    <div className="opps-grid">
     {filteredOpps.map((opp, idx)=>(
      <article className="opp-card" key={idx}>
       <div className="opp-top">
        <span className="opp-type-badge">{opp.type}</span>
        <span className="opp-amount-badge">{opp.amount}</span>
       </div>
       <div className="opp-content">
        <div className="opp-icon"><Ic n={opp.icon} s={24}/></div>
        <div>
         <h3 className="opp-title">{opp.title}</h3>
         <p className="opp-org">{opp.org}</p>
        </div>
       </div>
       <p className="opp-desc">{opp.desc}</p>
       <div className="opp-footer">
        <span className="opp-verified">✔ {x('Verified Fund','Mfuko Halisi')}</span>
        <button className="opp-apply-btn" onClick={()=>start('register')}>{x('Check Eligibility →','Angalia Ustahiki →')}</button>
       </div>
      </article>
     ))}
     {!filteredOpps.length && (
      <div className="opp-empty">
       <p>{x('No bursary program matches your search filter.','Hakuna mfuko unaolingana na utafutaji wako.')}</p>
       <button className="cta-btn sm" onClick={()=>setQ('')}>{x('Clear Filter','Ondoa Kichujio')}</button>
      </div>
     )}
    </div>
   </div>
  </section>

  <Footer lang={lang}/>
 </div>
}
