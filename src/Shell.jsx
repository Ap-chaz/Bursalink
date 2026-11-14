import {useState} from 'react'
// Shared header and footer for the landing page and every public page.
export const Mark=()=><span className="mark"><svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M16 3 3 10l13 7 13-7z" fill="#1fb355"/><path d="M8 15v6c0 2 3.500 4 8 4s8-2 8-4v-6l-8 4.200z" fill="#0f6b4a"/></svg></span>
const links=x=>[['#/',x('Home','Nyumbani'),'/'],['#/national',x('National','Kitaifa'),'/national'],['#/counties',x('Counties','Kaunti'),'/counties'],['#/help',x('Help & Support','Msaada'),'/help']]
export function Header({lang,toggle,start,route}){
 const x=(a,b)=>lang==='sw'?b:a,[menu,setMenu]=useState(false)
 return <header className="nav"><div className="navin">
  <a className="brand" href="#/" aria-label="BursaLink"><Mark/><b>BursaLink</b></a>
  <nav className={'links '+(menu?'open':'')} aria-label="Main">{links(x).map(([h,l,r])=><a key={h} href={h} aria-current={route===r?'page':undefined} onClick={()=>setMenu(false)}>{l}</a>)}</nav>
  <div className="navr">
   <a className="iconbtn" href={route==='/'?'#search':'#/counties'} aria-label={x('Search','Tafuta')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.300-4.300"/></svg></a>
   <button className="signin" onClick={start}>{x('Sign in','Ingia')}</button>
   <button className="reg" onClick={start}>{x('Register','Jisajili')}</button>
   <button className="iconbtn lang" onClick={toggle} aria-label={lang==='en'?'Kiswahili':'English'}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.500 2.500 3.500 5.500 3.500 9S14.500 18.500 12 21c-2.500-2.500-3.500-5.500-3.500-9S9.500 5.500 12 3z"/></svg><small>{lang==='en'?'SW':'EN'}</small></button>
   <button className="iconbtn burger" aria-label="Menu" aria-expanded={menu} onClick={()=>setMenu(m=>!m)}><span/><span/><span/></button>
  </div></div></header>}
export function Footer({lang}){
 const x=(a,b)=>lang==='sw'?b:a
 return <footer><div className="fin">
  <div className="ftop"><a className="brand light" href="#/"><Mark/><b>BursaLink</b></a>
   <nav aria-label="Footer">{[...links(x),['#/terms',x('Terms & Conditions','Masharti'),'/terms'],['#/privacy',x('Privacy Policy','Faragha'),'/privacy']].map(([h,l])=><a key={h} href={h}>{l}</a>)}</nav></div>
  <p className="ftag">{x('Giving Kenyan students easy access to bursaries.','Kuwapa wanafunzi wa Kenya urahisi wa kupata bursari.')}</p>
  <p className="fcopy">© 2026 BursaLink. {x('All rights reserved. Applying is always free. This demo uses made-up sample data.','Haki zote zimehifadhiwa. Kuomba ni bure daima. Onyesho hili linatumia data ya mfano.')}</p>
 </div></footer>}
