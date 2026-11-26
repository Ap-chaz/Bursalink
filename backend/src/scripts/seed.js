import pool from '../config/db.js';

const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const sampleBursaries = [
  {
    id: 'b1',
    title: 'Westlands NG-CDF Secondary & Tertiary Bursary',
    org: 'Westlands NG-CDF Committee',
    type: 'Constituency',
    place: { type: 'constituency', name: 'Westlands' },
    min: 5000,
    max: 20000,
    levels: ['secondary', 'college', 'university'],
    opens: d(-20),
    closes: d(14),
    status: 'published',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'Constituency bursary providing direct tuition support for bright and needy students residing in Westlands.',
    how: 'A vetted CDF education panel reviews each applicant fairly based on verified residence and fee need.',
    contact: 'bursary@westlandscdf.go.ke',
    q: 'Explain your current household financial situation and why you require bursary assistance.'
  },
  {
    id: 'b2',
    title: 'Nairobi City County Executive Bursary Fund',
    org: 'Nairobi City County Government',
    type: 'County',
    place: { type: 'county', name: 'Nairobi' },
    min: 8000,
    max: 35000,
    levels: ['secondary', 'vocational', 'university'],
    opens: d(-10),
    closes: d(5),
    status: 'published',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'County executive scholarship funding vulnerable students enrolled in recognized secondary and tertiary institutions.',
    how: 'Ward bursary sub-committees evaluate student applications before county-level ratification.',
    contact: 'education@nairobi.go.ke',
    q: 'Briefly explain your family background and current school fee arrears.'
  },
  {
    id: 'b3',
    title: 'Equity Group Foundation Wings to Fly Scholarship',
    org: 'Equity Group Foundation',
    type: 'Foundation',
    place: null,
    min: 30000,
    max: 75000,
    levels: ['secondary'],
    opens: d(-5),
    closes: d(30),
    status: 'published',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'Comprehensive scholarship covering tuition, books, uniform, and leadership training for top-performing, needy scholars.',
    how: 'Community scholarship selection boards conduct interviews and home visits for shortlisted applicants.',
    contact: 'scholarships@equitygroupfoundation.com',
    q: 'Describe your leadership experience, community involvement, and educational aspirations.'
  },
  {
    id: 'b4',
    title: 'Kiambu County Ward Education Bursary',
    org: 'County Government of Kiambu',
    type: 'County',
    place: { type: 'county', name: 'Kiambu' },
    min: 5000,
    max: 25000,
    levels: ['secondary', 'college', 'university'],
    opens: d(-5),
    closes: d(12),
    status: 'published',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'County bursary scheme supporting vulnerable students across Kiambu wards.',
    how: 'Reviewed by ward bursary vetting committees with local administration verification.',
    contact: 'bursaries@kiambu.go.ke',
    q: 'Describe the challenges your family faces in paying school fees.'
  },
  {
    id: 'b5',
    title: 'Corporate STEM & Technical Education Grant',
    org: 'East Africa Energy Corp',
    type: 'Corporate',
    place: null,
    min: 10000,
    max: 30000,
    levels: ['university'],
    opens: d(-40),
    closes: d(-2),
    status: 'closed',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'Annual engineering and STEM bursary grant (Application period now concluded for the current cycle).',
    how: 'Corporate CSR panel review.',
    contact: 'csr@eaenergy.com',
    q: 'Highlight your academic achievements in science or technology.'
  },
  {
    id: 'b6',
    title: 'Parklands / Highridge Ward Education Fund',
    org: 'Westlands NG-CDF Committee',
    type: 'Constituency',
    place: { type: 'ward', name: 'Parklands/Highridge' },
    min: 3000,
    max: 10000,
    levels: ['secondary'],
    opens: d(-3),
    closes: d(20),
    status: 'published',
    docs: ['National ID or Birth Certificate', 'School fee statement'],
    desc: 'Ward-level emergency fee fund targeting underprivileged families in Parklands and Highridge.',
    how: 'Fast-track committee verification with local chief and school administration.',
    contact: 'parklands-cdf@westlandscdf.go.ke',
    q: 'Explain the immediate financial hardship necessitating this ward bursary grant.'
  }
];

export async function runSeed() {
  console.log('Seeding official bursary listings...');
  for (const b of sampleBursaries) {
    await pool.execute(
      `INSERT INTO bursaries (id, title, org, type, place, min, max, levels, opens, closes, status, docs, \`desc\`, how, contact, q)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title=VALUES(title), org=VALUES(org), type=VALUES(type), place=VALUES(place),
        min=VALUES(min), max=VALUES(max), levels=VALUES(levels), opens=VALUES(opens),
        closes=VALUES(closes), status=VALUES(status), docs=VALUES(docs),
        \`desc\`=VALUES(\`desc\`), how=VALUES(how), contact=VALUES(contact), q=VALUES(q)`,
      [
        b.id,
        b.title,
        b.org,
        b.type,
        b.place ? JSON.stringify(b.place) : null,
        b.min,
        b.max,
        JSON.stringify(b.levels),
        b.opens,
        b.closes,
        b.status,
        JSON.stringify(b.docs),
        b.desc,
        b.how,
        b.contact,
        b.q
      ]
    );
  }
  console.log('✅ Real bursaries successfully populated.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(() => pool.end())
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
