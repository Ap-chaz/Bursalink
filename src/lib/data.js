// MADE-UP sample data. Replace with your backend.
export const GEO={'Sample County':{'Sample North':['Demo Ward','Test Ward'],'Sample South':['River Ward']},'Other County':{'Other East':['Hill Ward']}}
const o=(title,org,type,place,min,max,levels,opens,closes,status,docs=['ID or birth certificate','School fee statement'])=>({title,org,type,place,min,max,levels,opens,closes,status,docs,desc:'Helps learners with school fees. Made-up sample.',how:'A panel reviews each application fairly. Need is considered but never decides alone.',contact:'help@example.org',q:'Tell us briefly why you need this bursary.'})
const d=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10)
export const BURSARIES=[
o('Sample North Bursary','Sample North Fund','Constituency',{type:'constituency',name:'Sample North'},5000,20000,['secondary'],d(-20),d(12),'published'),
o('Sample County Bursary','Sample County Govt','County',{type:'county',name:'Sample County'},8000,25000,['secondary','university'],d(-10),d(1),'published'),
o('Demo Foundation Scholarship','Demo Foundation','Foundation',null,20000,60000,['secondary','university'],d(-5),d(30),'published'),
o('Other County Bursary','Other County Govt','County',{type:'county',name:'Other County'},3000,10000,['secondary'],d(-5),d(9),'published'),
o('Sample Corp Grant','Sample Corp','Corporate',null,10000,30000,['university'],d(-40),d(-2),'closed'),
o('Demo Ward Fund','Sample North Fund','Constituency',{type:'ward',name:'Demo Ward'},2000,6000,['primary','secondary'],d(-3),d(20),'published')].map((b,i)=>({...b,id:'b'+(i+1)}))
