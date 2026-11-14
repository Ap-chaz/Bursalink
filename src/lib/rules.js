export const STATUS=['submitted','under_review','more_info_needed','shortlisted','approved','unsuccessful','withdrawn']
export const DECIDED=['approved','unsuccessful','withdrawn']
export const placeOk=(b,area)=>!b.place||area?.[b.place.type]===b.place.name
export const iso=d=>new Date(d).toISOString().slice(0,10)
export const isOpen=(b,today=new Date())=>b.status==='published'&&iso(today)>=b.opens&&iso(today)<=b.closes
export const daysLeft=(b,today=new Date())=>Math.ceil((new Date(b.closes)-new Date(iso(today)))/864e5)
export const canApply=(b,area,today)=>!!area&&isOpen(b,today)&&placeOk(b,area)
export const eligibility=(b,p)=>{const meets=[],not=[],missing=[]
 if(placeOk(b,p.area))meets.push('area');else not.push('area')
 if(!p.level)missing.push('level');else (b.levels.includes(p.level)?meets:not).push('level')
 for(const d of b.docs)if(!p.docs?.[d])missing.push('doc:'+d)
 return{meets,not,missing}}
export const completion=p=>{const f=['name','phone','school','level','year','idNo','guardian'];return Math.round(100*f.filter(k=>p[k]).length/f.length)}
export const validateFile=f=>!['application/pdf','image/jpeg','image/png'].includes(f.type)?'type':f.size>5*1024*1024?'size':null
