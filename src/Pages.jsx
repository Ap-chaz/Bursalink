import {useMemo,useState} from 'react'
const COUNTIES="Mombasa,Kwale,Kilifi,Tana River,Lamu,Taita-Taveta,Garissa,Wajir,Mandera,Marsabit,Isiolo,Meru,Tharaka-Nithi,Embu,Kitui,Machakos,Makueni,Nyandarua,Nyeri,Kirinyaga,Murang'a,Kiambu,Turkana,West Pokot,Samburu,Trans-Nzoia,Uasin Gishu,Elgeyo-Marakwet,Nandi,Baringo,Laikipia,Nakuru,Narok,Kajiado,Kericho,Bomet,Kakamega,Vihiga,Bungoma,Busia,Siaya,Kisumu,Homa Bay,Migori,Kisii,Nyamira,Nairobi".split(',')

const Band=({t,lead})=><section className="phead"><div className="pin"><h1>{t}</h1>{lead&&<p>{lead}</p>}</div></section>
const Cta=({x,start})=><section className="cta"><div className="pin"><h2>{x('See what you can apply for','Ona unachoweza kuomba')}</h2><p>{x('Sign in with a one-time code and register your ward once.','Ingia kwa msimbo wa mara moja na usajili wadi yako mara moja.')}</p><button className="reg" onClick={start}>{x('Get started','Anza')}</button></div></section>
const Doc=({x,lang,items,intro})=><div className="pin doc">{lang==='sw'&&<p className="note">Toleo la Kiswahili linakuja hivi karibuni. Kwa sasa maandishi haya yako kwa Kiingereza.</p>}<p className="note">{x('Draft for review. Have a Kenyan lawyer check this text before you launch.','')}</p>{intro&&<p>{intro}</p>}{items.map(([h,t])=><section key={h}><h2>{h}</h2>{t.map((l,i)=><p key={i}>{l}</p>)}</section>)}</div>

export default function Page({route,lang,start}){
 const x=(a,b)=>lang==='sw'?b:a,[q,setQ]=useState('')
 const list=useMemo(()=>COUNTIES.filter(c=>c.toLowerCase().includes(q.trim().toLowerCase())),[q])
 const props={x,start}
 if(route==='/national'){
  const cards=[
   [x('Government bursary programmes','Programu za bursari za serikali'),x('Support for learners in public secondary schools and colleges, set by national government.','Msaada kwa wanafunzi wa shule za upili na vyuo vya umma, unaowekwa na serikali kuu.')],
   [x('Constituency development funds','Mifuko ya maendeleo ya eneobunge'),x('Bursaries run in each constituency. You apply to the one where you live.','Bursari zinazoendeshwa kila eneobunge. Unaomba katika eneo unaloishi.')],
   [x('Higher education support','Msaada wa elimu ya juu'),x('Loans, scholarships and grants for university and college students.','Mikopo, ufadhili na ruzuku kwa wanafunzi wa vyuo vikuu na vyuo.')],
   [x('Technical and vocational training','Mafunzo ya kiufundi na ufundi'),x('Funding for TVET and skills courses, open to students from every county.','Ufadhili wa kozi za TVET na ujuzi, wazi kwa wanafunzi wa kaunti zote.')],
   [x('Learners with special needs','Wanafunzi wenye mahitaji maalum'),x('Extra support for learners with disabilities and for orphaned or vulnerable children.','Msaada wa ziada kwa wanafunzi wenye ulemavu na watoto yatima au walio hatarini.')],
   [x('National foundations and companies','Wakfu na makampuni ya kitaifa'),x('Scholarships open to students across Kenya, often with a clear closing date.','Ufadhili wazi kwa wanafunzi kote Kenya, mara nyingi na tarehe wazi ya kufunga.')]]
  return <main className="pg"><Band t={x('National bursaries','Bursari za kitaifa')} lead={x('Bursaries and scholarships open to students across Kenya, whichever county you live in.','Bursari na ufadhili wazi kwa wanafunzi kote Kenya, bila kujali kaunti yako.')}/>
   <div className="pin"><div className="pgrid2">{cards.map(([h,t])=><article className="pcard" key={h}><span className="pic">★</span><div><h3>{h}</h3><p>{t}</p></div></article>)}</div>
   <p className="muted2">{x('These are sample groups. Real listings appear after you sign in and register your ward.','Haya ni makundi ya mfano. Orodha halisi huonekana baada ya kuingia na kusajili wadi yako.')}</p></div><Cta {...props}/></main>}
 if(route==='/counties')return <main className="pg"><Band t={x('Bursaries by county','Bursari kwa kaunti')} lead={x('Choose your county to find bursaries from your county government, constituency and ward.','Chagua kaunti yako kupata bursari kutoka serikali ya kaunti, eneobunge na wadi.')}/>
   <div className="pin"><label className="csearch"><span className="sr">{x('Search counties','Tafuta kaunti')}</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={x('Search for a county','Tafuta kaunti')}/></label>
   <p className="muted2" aria-live="polite">{list.length} {x('of 47 counties','kati ya kaunti 47')}</p>
   <ul className="cgrid">{list.map(c=><li key={c}><button onClick={start}><b>{c}</b><span>{x('See bursaries','Ona bursari')}</span></button></li>)}</ul>
   {!list.length&&<p className="muted2">{x('No county matches. Check the spelling.','Hakuna kaunti inayolingana. Angalia tahajia.')}</p>}</div><Cta {...props}/></main>
 if(route==='/help'){
  const faq=[
   [x('Is BursaLink free?','Je, BursaLink ni bure?'),x('Yes. Applying is always free. Never pay anyone to apply, to be shortlisted or to get a decision.','Ndiyo. Kuomba ni bure daima. Usimlipe mtu yeyote ili kuomba, kuorodheshwa au kupata uamuzi.')],
   [x('How do I sign in?','Ninaingiaje?'),x('Enter your email address and we send you a one-time code. There is no password to remember.','Weka barua pepe yako na tutakutumia msimbo wa mara moja. Hakuna nenosiri la kukumbuka.')],
   [x('Why do I need to choose my ward?','Kwa nini nichague wadi yangu?'),x('Many bursaries are only for people who live in one ward, constituency or county. Your ward is saved once so we can show what you can apply for.','Bursari nyingi ni za wakazi wa wadi, eneobunge au kaunti moja. Wadi yako huhifadhiwa mara moja ili tukuonyeshe unachoweza kuomba.')],
   [x('Can I change my ward later?','Naweza kubadilisha wadi baadaye?'),x('Not on your own. Visit your ward or constituency office and an administrator must approve the change. This keeps things fair for everyone.','Si peke yako. Tembelea ofisi ya wadi au eneobunge na msimamizi lazima aidhinishe. Hii huweka haki kwa wote.')],
   [x('What documents do I need?','Ninahitaji hati gani?'),x('Usually an ID or birth certificate and a school fee statement. Each bursary lists what it needs. Files can be PDF, JPG or PNG, up to 5 MB.','Kwa kawaida kitambulisho au cheti cha kuzaliwa na taarifa ya ada. Kila bursari huorodhesha inachohitaji. Faili ziwe PDF, JPG au PNG, hadi MB 5.')],
   [x('Does meeting the requirements guarantee a bursary?','Kutimiza masharti kunahakikisha bursari?'),x('No. The check shown is preliminary. A panel at the provider reviews every application and makes the decision.','Hapana. Ukaguzi unaoonyeshwa ni wa awali. Jopo la mtoaji hukagua kila ombi na kuamua.')],
   [x('My application was not successful. What now?','Ombi langu halikufanikiwa. Nifanye nini?'),x('We are sorry. You can still apply for other bursaries you qualify for. Check the Discover tab for more.','Pole. Bado unaweza kuomba bursari nyingine unazostahili. Angalia kichupo cha Tafuta.')]]
  return <main className="pg"><Band t={x('Help & Support','Msaada')} lead={x('Answers to common questions, and how to reach us.','Majibu ya maswali ya kawaida, na jinsi ya kuwasiliana nasi.')}/>
   <div className="pin helpgrid"><div className="faq">{faq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
   <aside className="side"><div className="pcard col"><h3>{x('Contact us','Wasiliana nasi')}</h3><p>{x('Write to','Andika kwa')} <a href="mailto:help@example.org">help@example.org</a></p><p>{x('Or ask at your ward or constituency office.','Au uliza ofisi ya wadi au eneobunge.')}</p></div>
    <div className="pcard col warn"><h3>{x('Report a suspicious request','Ripoti ombi la kutia shaka')}</h3><p>{x('If someone asks you to pay for a bursary, or asks for your code or ID photo outside BursaLink, do not respond. Tell us at','Mtu akikuomba ulipe bursari, au akuombe msimbo au picha ya kitambulisho nje ya BursaLink, usijibu. Tuambie kwa')} <a href="mailto:help@example.org">help@example.org</a>.</p></div></aside></div><Cta {...props}/></main>}
 if(route==='/terms')return <main className="pg"><Band t={x('Terms & Conditions','Masharti na Vigezo')} lead={x('Last updated 14 November 2026','Ilisasishwa 14 Novemba 2026')}/><Doc x={x} lang={lang} items={[
  ['1. Using BursaLink',['BursaLink helps students find bursaries and scholarships, apply, and follow their applications. By creating an account you agree to these terms.']],
  ['2. It is free',['BursaLink never charges students. No one at BursaLink or acting for it may ask you for money to apply, to be shortlisted or to be approved.']],
  ['3. Your account',['Sign in with your own email address and one-time code. Keep your code private and do not let anyone else use your account.']],
  ['4. Telling the truth',['Everything you enter and upload must be true and belong to you. You confirm this when you submit an application. False information can lead to your application being rejected.']],
  ['5. Your area',['You choose the ward where you live once. Many bursaries depend on it. To change it you must visit your ward or constituency office and an administrator must approve the change.']],
  ['6. Decisions',['Each bursary is run by its provider, such as a county, constituency fund or foundation. The provider alone decides who receives funding. Meeting the requirements does not promise funding.']],
  ['7. Acceptable use',['Do not use BursaLink to cheat, impersonate others, upload harmful files or interfere with the service.']],
  ['8. Changes',['We may update these terms. The date at the top shows the latest version.']],
  ['9. Contact',['Questions about these terms: help@example.org']]]}/></main>
 if(route==='/privacy')return <main className="pg"><Band t={x('Privacy Policy','Sera ya Faragha')} lead={x('Last updated 14 November 2026','Ilisasishwa 14 Novemba 2026')}/><Doc x={x} lang={lang} intro={x('This policy explains what personal information BursaLink collects, why, and the choices you have. It is written to follow the Data Protection Act, 2019 of Kenya.','')} items={[
  ['What we collect',['Your email address; your name, phone number, school, level of study and guardian details; the ward, constituency and county where you live; the documents you upload; and your applications and their status.']],
  ['Why we use it',['To create your account, show bursaries you can apply for, let providers review your applications, and send you updates you have chosen to receive.']],
  ['Who can see it',['Only the provider running a bursary can see the applications sent to it. We do not sell your information or use it for advertising.']],
  ['How we keep it safe',['Access is limited to people who need it, and changes to applications are recorded with who made them and when.']],
  ['Your rights',['You can ask to see, correct or delete your information, and you can ask us to stop using it. You can also complain to the Office of the Data Protection Commissioner.']],
  ['Deleting your account',['You can delete your account from your profile. Providers may keep records of applications already submitted where the law or their audit rules require it.']],
  ['Contact',['Questions about privacy: help@example.org']]]}/></main>
 return <main className="pg"><Band t="404"/><div className="pin"><p>{x('We could not find that page.','Hatukupata ukurasa huo.')} <a href="#/">{x('Go to the home page','Rudi nyumbani')}</a></p></div></main>}
