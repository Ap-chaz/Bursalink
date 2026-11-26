import {useState} from 'react'
// Shared header and footer for the landing page and every public page.
export const Mark=()=><span className="mark"><svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M16 3 3 10l13 7 13-7z" fill="#1fb355"/><path d="M8 15v6c0 2 3.500 4 8 4s8-2 8-4v-6l-8 4.200z" fill="#0f6b4a"/></svg></span>
const links=x=>[['#/',x('Home','Nyumbani'),'/'],['#/national',x('National','Kitaifa'),'/national'],['#/counties',x('Counties','Kaunti'),'/counties'],['#/help',x('Help & Support','Msaada'),'/help']]
export function Header({lang,toggle,start,route}){
 const x=(a,b)=>lang==='sw'?b:a,[menu,setMenu]=useState(false)
 return <header className="nav"><div className="navin">
  <a className="brand" href="#/" aria-label="BursaLink"><Mark/><b>BursaLink</b></a>
  <nav className={'links '+(menu?'open':'')} aria-label="Main">
   {links(x).map(([h,l,r])=><a key={h} href={h} aria-current={route===r?'page':undefined} onClick={()=>setMenu(false)}>{l}</a>)}
   <div className="menu-auth">
    <button className="signin menu-signin" onClick={()=>{setMenu(false);start('signin')}}>{x('Sign in','Ingia')}</button>
    <button className="reg menu-reg" onClick={()=>{setMenu(false);start('register')}}>{x('Register','Jisajili')}</button>
   </div>
  </nav>
  <div className="navr">
   <a className="iconbtn" href={route==='/'?'#search':'#/counties'} aria-label={x('Search','Tafuta')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.300-4.300"/></svg></a>
   <button className="signin" onClick={()=>start('signin')}>{x('Sign in','Ingia')}</button>
   <button className="reg" onClick={()=>start('register')}>{x('Register','Jisajili')}</button>
   <button className="iconbtn lang" onClick={toggle} aria-label={lang==='en'?'Kiswahili':'English'}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.500 2.500 3.500 5.500 3.500 9S14.500 18.500 12 21c-2.500-2.500-3.500-5.500-3.500-9S9.500 5.500 12 3z"/></svg><small>{lang==='en'?'SW':'EN'}</small></button>
   <button className="iconbtn burger" aria-label="Menu" aria-expanded={menu} onClick={()=>setMenu(m=>!m)}><span/><span/><span/></button>
  </div></div></header>}
export function Footer({lang}){
 const x=(a,b)=>lang==='sw'?b:a
 return <footer><div className="fin">
  <div className="fgrid">
   <div className="fbrand">
    <a className="brand light" href="#/"><Mark/><b>BursaLink</b></a>
    <p className="ftag">{x(
     'Kenya’s unified student bursary & scholarship portal — connecting secondary, TVET, college, and university learners to verified NG-CDF, county, foundation, and corporate funding across all 47 counties.',
     'Jukwaa la pamoja la bursari na ufadhili wa masomo nchini Kenya — likiwaunganisha wanafunzi wa shule za upili, TVET, vyuo na vyuo vikuu na ufadhili wa NG-CDF, kaunti, wakfu na makampuni katika kaunti zote 47.'
    )}</p>
    <div className="fbadges">
     <span>✔ {x('100% Free Application','Ombi Bure 100%')}</span>
     <span>✔ {x('47 Counties Covered','Kaunti Zote 47')}</span>
     <span>✔ {x('ODPC Data Protected','Ulinzi wa Data')}</span>
    </div>
   </div>

   <div className="fcol">
    <h4>{x('Bursary Programmes','Programu za Bursari')}</h4>
    <ul>
     <li><a href="#/national">{x('National & Foundation Funds','Mifuko ya Kitaifa na Wakfu')}</a></li>
     <li><a href="#/counties">{x('County Government Bursaries','Bursari za Serikali za Kaunti')}</a></li>
     <li><a href="#/counties">{x('NG-CDF Constituency Funds','Mifuko ya Maeneobunge (NG-CDF)')}</a></li>
     <li><a href="#/national">{x('Secondary School Scholarships','Ufadhili wa Shule za Upili')}</a></li>
     <li><a href="#/national">{x('University, College & TVET','Vyuo Vikuu, Vyuo na TVET')}</a></li>
    </ul>
   </div>

   <div className="fcol">
    <h4>{x('Student Portal','Tovuti ya Wanafunzi')}</h4>
    <ul>
     <li><a href="#/">{x('Search Open Bursaries','Tafuta Bursari zilizo Wazi')}</a></li>
     <li><a href="#/">{x('Track Application by Ref','Fuatilia Ombi kwa Nambari')}</a></li>
     <li><a href="#/help">{x('Required Documents Guide','Mwongozo wa Hati Zinazohitajika')}</a></li>
     <li><a href="#/help">{x('Ward & Residency Rules','Kanuni za Wadi na Makazi')}</a></li>
     <li><a href="#/help">{x('Frequently Asked Questions','Maswali Yanayoulizwa Mara kwa Mara')}</a></li>
    </ul>
   </div>

   <div className="fcol">
    <h4>{x('Contact & Governance','Mawasiliano na Utawala')}</h4>
    <ul>
     <li><a href="mailto:support@bursalink.go.ke">✉ support@bursalink.go.ke</a></li>
     <li><a href="tel:+254202210000">☎ +254 (0) 20 221 0000</a></li>
     <li><span>📍 {x('Harambee Ave, Nairobi, Kenya','Barabara ya Harambee, Nairobi')}</span></li>
     <li><a href="#/terms">{x('Terms & Conditions','Masharti na Vigezo')}</a></li>
     <li><a href="#/privacy">{x('Privacy Policy (Data Protection Act)','Sera ya Faragha (Sheria ya Data)')}</a></li>
     <li><a href="#/admin">{x('Staff & Committee Portal →','Tovuti ya Wasimamizi na Kamati →')}</a></li>
    </ul>
   </div>
  </div>

  <div className="fbot">
   <p className="fcopy">© 2026 BursaLink Kenya. {x('All rights reserved. Applying for any bursary on BursaLink is 100% free — never pay anyone to apply, shortlist, or approve your application.','Haki zote zimehifadhiwa. Kuomba bursari yoyote kwenye BursaLink ni bure 100% — usimlipe mtu yeyote ili kuomba au kuidhinishwa.')}</p>
   <div className="flinks">
    <a href="#/terms">{x('Terms','Masharti')}</a>
    <a href="#/privacy">{x('Privacy','Faragha')}</a>
    <a href="#/help">{x('Report Fraud','Ripoti Ulaghai')}</a>
    <a href="#/admin">{x('Staff Sign In','Kuingia kwa Wafanyakazi')}</a>
   </div>
  </div>
 </div></footer>}
