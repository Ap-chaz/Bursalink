// Made-up sample data. Delete this file when the real backend exists.
export const counties=[{id:'c1',name:'Sample County A'},{id:'c2',name:'Sample County B'}];
export const constituencies=[{id:'k1',countyId:'c1',name:'Sample Central'},{id:'k2',countyId:'c2',name:'Sample East'}];
export const wards=[{id:'w1',constituencyId:'k1',name:'Sample Ward 1'},{id:'w2',constituencyId:'k1',name:'Sample Ward 2'},{id:'w3',constituencyId:'k2',name:'Sample Ward 3'}];
export const providers=[{id:'p1',name:'Sample Foundation',type:'Foundation'},{id:'p2',name:'Sample Corporate Fund',type:'Corporate'},{id:'p3',name:'Sample County Office',type:'County'}];
const S=['secondary'],U=['college','university'],A=['secondary','college','university'];
// id,title,provider,scope,placeId,min,max,levels,opens,closes
const rows=[
['b1','Everyone Secondary Support','p1','all',null,10000,30000,S,'2026-01-01','2026-12-31'],
['b2','County A Bright Minds','p3','county','c1',15000,40000,A,'2026-02-01','2026-12-20'],
['b3','Sample Central Bursary','p3','constituency','k1',8000,20000,A,'2026-03-01','2026-12-01'],
['b4','Ward 1 Learners Fund','p3','ward','w1',5000,12000,S,'2026-03-01','2026-11-30'],
['b5','Ward 2 Learners Fund','p3','ward','w2',5000,12000,S,'2026-03-01','2026-12-15'],
['b6','Corporate Tech Scholars','p2','all',null,50000,120000,U,'2026-04-01','2026-12-31'],
['b7','County B Future Leaders','p3','county','c2',20000,45000,A,'2026-02-01','2026-12-18'],
['b8','Foundation College Aid','p1','all',null,20000,60000,['college'],'2026-01-01','2026-11-01'],
['b9','Sample East Bursary','p3','constituency','k2',8000,20000,A,'2026-03-01','2026-12-25'],
['b10','Opening Soon: Girls in STEM','p2','all',null,30000,70000,A,'2027-01-10','2027-03-01']];
export const bursaries=rows.map(([id,title,pid,scope,placeId,min,max,levels,opens,closes])=>({id,title,providerId:pid,providerName:providers.find(p=>p.id===pid).name,type:providers.find(p=>p.id===pid).type,scope,placeId,min,max,levels,opens,closes,
 description:'Sample support for school or college fees.',docs:['ID or birth certificate','School fee structure'],added:opens}));
export const demoStudent={email:'student@example.com',name:'Amina Sample',level:'secondary',area:null,profileDone:20};
