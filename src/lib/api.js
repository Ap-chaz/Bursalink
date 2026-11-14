// MOCK BACKEND (localStorage). Replace each function with a real call; keep the return shapes.
import {BURSARIES} from './data.js'
import {isOpen,placeOk,DECIDED} from './rules.js'
const K='bursalink'
const blank={user:null,profile:{docs:{},notify:{status:true,deadline:true,match:true},saver:false,lang:'en'},apps:[],drafts:{},saved:[],notifs:[],areaReq:null,seq:0}
export const load=()=>{try{return{...blank,...JSON.parse(localStorage.getItem(K))}}catch{return{...blank}}}
const save=s=>(localStorage.setItem(K,JSON.stringify(s)),s)
const upd=fn=>{const s=load();fn(s);return save(s)}
const note=(s,text,go)=>s.notifs.unshift({id:Date.now()+Math.random(),text,go,at:new Date().toISOString(),read:false})
export const listBursaries=()=>BURSARIES
export const sendCode=async email=>{if(!/\S+@\S+\.\S+/.test(email))throw new Error('email')}
export const verifyCode=async(email,code)=>{if(code!=='123456')throw new Error('code');upd(s=>{s.user={email}})} // demo code 123456
export const updateProfile=async patch=>upd(s=>{s.profile={...s.profile,...patch}})
export const registerArea=async area=>upd(s=>{if(s.profile.area)throw new Error('locked');s.profile.area=area})
export const requestAreaChange=async(area,reason)=>upd(s=>{if(s.areaReq)throw new Error('pending');s.areaReq={area,reason}})
export const toggleSave=async id=>upd(s=>{s.saved=s.saved.includes(id)?s.saved.filter(x=>x!==id):[...s.saved,id]})
export const saveDraft=async(id,data)=>upd(s=>{s.drafts[id]=data}) // call on every change
export const submitApplication=async(id,answers)=>upd(s=>{const b=BURSARIES.find(x=>x.id===id)
 if(!isOpen(b)||!placeOk(b,s.profile.area))throw new Error('closed');if(s.apps.some(a=>a.bursaryId===id))throw new Error('dup')
 const ref=`BL-${new Date().getFullYear()}-${String(++s.seq).padStart(6,'0')}`
 s.apps.push({id:ref,ref,bursaryId:id,answers,status:'submitted',history:[{status:'submitted',at:new Date().toISOString()}],messages:[]})
 delete s.drafts[id];note(s,`Application ${ref} submitted`,{view:'app',id:ref})})
export const withdraw=async ref=>upd(s=>{const a=s.apps.find(x=>x.ref===ref);if(DECIDED.includes(a.status))throw new Error('decided')
 a.status='withdrawn';a.history.push({status:'withdrawn',at:new Date().toISOString()})})
export const markAllRead=async()=>upd(s=>s.notifs.forEach(n=>n.read=true))
export const markRead=async id=>upd(s=>{const n=s.notifs.find(x=>x.id===id);if(n)n.read=true})
export const logout=async()=>upd(s=>{s.user=null})
export const deleteAccount=async()=>save({...blank})
