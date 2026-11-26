// Official IEBC administrative units: 47 Counties -> 290 Constituencies -> Wards.
// Ordered by IEBC county code (001 Mombasa ... 047 Nairobi) and constituency code (001 ... 290).
// Ward lists are filled where verified; an empty array means the ward list is still to be added.
const C = (names, wards = {}) => Object.fromEntries(names.map(n => [n, wards[n] || []]));

export const GEO = {
  // 001
  'Mombasa': C(['Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'], {
    'Nyali': ['Frere Town', 'Ziwa la Ng\'ombe', 'Mkomani', 'Kongowea', 'Kadzandani'],
    'Mvita': ['Mji wa Kale/Makadara', 'Tudor', 'Tononoka', 'Shimanzi/Ganjoni', 'Majengo']
  }),
  // 002
  'Kwale': C(['Msambweni', 'Lunga Lunga', 'Matuga', 'Kinango']),
  // 003
  'Kilifi': C(['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini']),
  // 004
  'Tana River': C(['Garsen', 'Galole', 'Bura']),
  // 005
  'Lamu': C(['Lamu East', 'Lamu West']),
  // 006
  'Taita Taveta': C(['Taveta', 'Wundanyi', 'Mwatate', 'Voi']),
  // 007
  'Garissa': C(['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara']),
  // 008
  'Wajir': C(['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South']),
  // 009
  'Mandera': C(['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey']),
  // 010
  'Marsabit': C(['Moyale', 'North Horr', 'Saku', 'Laisamis']),
  // 011
  'Isiolo': C(['Isiolo North', 'Isiolo South']),
  // 012
  'Meru': C(['Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East', 'North Imenti', 'Buuri', 'Central Imenti', 'South Imenti']),
  // 013
  'Tharaka-Nithi': C(['Maara', 'Chuka/Igambang\'ombe', 'Tharaka']),
  // 014
  'Embu': C(['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North']),
  // 015
  'Kitui': C(['Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West', 'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South']),
  // 016
  'Machakos': C(['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala']),
  // 017
  'Makueni': C(['Mbooni', 'Kilome', 'Kaiti', 'Makueni', 'Kibwezi West', 'Kibwezi East']),
  // 018
  'Nyandarua': C(['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Joro Orok', 'Ndaragwa']),
  // 019
  'Nyeri': C(['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini', 'Nyeri Town']),
  // 020
  'Kirinyaga': C(['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central']),
  // 021
  'Murang\'a': C(['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragwa', 'Kandara', 'Gatanga']),
  // 022
  'Kiambu': C(['Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri', 'Kiambu', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari'], {
    'Thika Town': ['Township', 'Kamenu', 'Hospital', 'Gatuanyaga', 'Ngoliba'],
    'Ruiru': ['Gitothua', 'Biashara', 'Gatongora', 'Kahawa Sukari', 'Kahawa Wendani', 'Kiuu', 'Mwiki', 'Mwihoko'],
    'Kiambu': ['Ting\'ang\'a', 'Ndumberi', 'Riabai', 'Township']
  }),
  // 023
  'Turkana': C(['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East']),
  // 024
  'West Pokot': C(['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South']),
  // 025
  'Samburu': C(['Samburu West', 'Samburu North', 'Samburu East']),
  // 026
  'Trans Nzoia': C(['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany']),
  // 027
  'Uasin Gishu': C(['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses']),
  // 028
  'Elgeyo-Marakwet': C(['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South']),
  // 029
  'Nandi': C(['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop']),
  // 030
  'Baringo': C(['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine']),
  // 031
  'Laikipia': C(['Laikipia West', 'Laikipia East', 'Laikipia North']),
  // 032
  'Nakuru': C(['Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North', 'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East'], {
    'Nakuru Town East': ['Biashara', 'Kivumbini', 'Flamingo', 'Menengai', 'Nakuru East']
  }),
  // 033
  'Narok': C(['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West']),
  // 034
  'Kajiado': C(['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South']),
  // 035
  'Kericho': C(['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin']),
  // 036
  'Bomet': C(['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin']),
  // 037
  'Kakamega': C(['Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West', 'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani']),
  // 038
  'Vihiga': C(['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya']),
  // 039
  'Bungoma': C(['Mt. Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East', 'Webuye West', 'Kimilili', 'Tongaren']),
  // 040
  'Busia': C(['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi']),
  // 041
  'Siaya': C(['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda']),
  // 042
  'Kisumu': C(['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'], {
    'Kisumu Central': ['Railways', 'Migosi', 'Shaurimoyo Kaloleni', 'Market Milimani', 'Kondele', 'Nyalenda B']
  }),
  // 043
  'Homa Bay': C(['Kasipul', 'Kabondo Kasipul', 'Karachuonyo', 'Rangwe', 'Homa Bay Town', 'Ndhiwa', 'Suba North', 'Suba South']),
  // 044
  'Migori': C(['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East']),
  // 045
  'Kisii': C(['Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache', 'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South']),
  // 046
  'Nyamira': C(['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu']),
  // 047
  'Nairobi': C(['Westlands', 'Dagoretti North', 'Dagoretti South', 'Lang\'ata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare'], {
    'Westlands': ['Kitisuru', 'Parklands/Highridge', 'Karura', 'Kangemi', 'Mountain View'],
    'Dagoretti North': ['Kilimani', 'Kawangware', 'Gatina', 'Kileleshwa', 'Kabiro'],
    'Lang\'ata': ['Karen', 'Nairobi West', 'Mugumo-ini', 'South C', 'Nyayo Highrise'],
    'Kibra': ['Laini Saba', 'Lindi', 'Makina', 'Woodley/Kenyatta Golf Course', 'Sarang\'ombe'],
    'Embakasi East': ['Upper Savannah', 'Lower Savannah', 'Embakasi', 'Utawala', 'Mihang\'o']
  })
};

const o = (title, org, type, place, min, max, levels, opens, closes, status, docs = ['National ID or Birth Certificate', 'School fee statement']) => ({
  title,
  org,
  type,
  place,
  min,
  max,
  levels,
  opens,
  closes,
  status,
  docs,
  desc: 'Official bursary scheme providing direct tuition support to bright, needy learners.',
  how: 'The bursary committee evaluates each application based on verified local residency, academic standing, and demonstrated financial need.',
  contact: 'support@bursalink.org',
  q: 'Explain your current household financial situation and why you require bursary assistance.'
});

const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const BURSARIES = [
  o(
    'Westlands NG-CDF Secondary & Tertiary Bursary',
    'Westlands NG-CDF Committee',
    'Constituency',
    { type: 'constituency', name: 'Westlands' },
    5000,
    20000,
    ['secondary', 'college', 'university'],
    d(-20),
    d(14),
    'published'
  ),
  o(
    'Nairobi City County Executive Bursary Fund',
    'Nairobi City County Government',
    'County',
    { type: 'county', name: 'Nairobi' },
    8000,
    35000,
    ['secondary', 'vocational', 'university'],
    d(-10),
    d(5),
    'published'
  ),
  o(
    'Equity Group Foundation Wings to Fly Scholarship',
    'Equity Group Foundation',
    'Foundation',
    null,
    30000,
    75000,
    ['secondary'],
    d(-5),
    d(30),
    'published'
  ),
  o(
    'Kiambu County Ward Education Bursary',
    'County Government of Kiambu',
    'County',
    { type: 'county', name: 'Kiambu' },
    5000,
    25000,
    ['secondary', 'college', 'university'],
    d(-5),
    d(12),
    'published'
  ),
  o(
    'Corporate STEM & Technical Education Grant',
    'East Africa Energy Corp',
    'Corporate',
    null,
    10000,
    30000,
    ['university'],
    d(-40),
    d(-2),
    'closed'
  ),
  o(
    'Parklands / Highridge Ward Education Fund',
    'Westlands NG-CDF Committee',
    'Constituency',
    { type: 'ward', name: 'Parklands/Highridge' },
    3000,
    10000,
    ['secondary'],
    d(-3),
    d(20),
    'published'
  )
].map((b, i) => ({ ...b, id: 'b' + (i + 1) }));
