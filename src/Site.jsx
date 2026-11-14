import {useEffect,useState} from 'react'
import Landing from './Landing.jsx'
import Page from './Pages.jsx'
import {Header,Footer} from './Shell.jsx'
// Public site router: #/ (home), #/national, #/counties, #/help, #/terms, #/privacy
const read=()=>location.hash.startsWith('#/')?location.hash.slice(1).split('?')[0]||'/':'/'
export default function Site(p){
 const [r,setR]=useState(read)
 useEffect(()=>{const f=()=>{if(location.hash.startsWith('#/')||location.hash===''){setR(read());scrollTo(0,0)}};addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[])
 return r==='/'?<Landing {...p}/>:<div className="lp"><Header {...p} route={r}/><Page route={r} {...p}/><Footer lang={p.lang}/></div>}
