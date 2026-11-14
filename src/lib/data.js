// Real administrative geographical data (Counties -> Constituencies -> Wards)
export const GEO = {
  'Nairobi': {
    'Westlands': ['Kitisuru', 'Parklands/Highridge', 'Karura', 'Kangemi', 'Mountain View'],
    'Dagoretti North': ['Kilimani', 'Kawangware', 'Gatina', 'Kileleshwa', 'Kabiro'],
    'Lang\'ata': ['Karen', 'Nairobi West', 'Mugumo-ini', 'South C', 'Nyayo Highrise'],
    'Kibra': ['Laini Saba', 'Lindi', 'Makina', 'Woodley/Kenyatta Golf Course', 'Sarang\'ombe'],
    'Embakasi East': ['Upper Savannah', 'Lower Savannah', 'Embakasi', 'Utawala', 'Mihang\'o']
  },
  'Kiambu': {
    'Ruiru': ['Gitothua', 'Biashara', 'Gatongora', 'Kahawa Sukari', 'Kahawa Wendani', 'Kiuu', 'Mwiki', 'Mwihoko'],
    'Kiambu Town': ['Ting\'ang\'a', 'Ndumberi', 'Riabai', 'Township'],
    'Thika Town': ['Township', 'Kamenu', 'Hospital', 'Gatuanyaga', 'Ngoliba']
  },
  'Mombasa': {
    'Mvita': ['Tudor', 'Tononoka', 'Majengo', 'Shimanzi/Ganjoni', 'Mji wa Kale/Makadara'],
    'Nyali': ['Frere Town', 'Kongowea', 'Kadzandani', 'Mkomani', 'Ziwa la Ng\'ombe']
  },
  'Kisumu': {
    'Kisumu Central': ['Railways', 'Migosi', 'Shaurimoyo Kaloleni', 'Market Milimani', 'Kondele']
  },
  'Nakuru': {
    'Nakuru Town East': ['Biashara', 'Kivumbini', 'Flamingo', 'Menengai', 'Nakuru East']
  }
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
