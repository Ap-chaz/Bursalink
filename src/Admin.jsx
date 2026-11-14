import { useEffect, useReducer, useState } from 'react';
import './admin.css';
import * as ad from './lib/admin.js';
import { Mark } from './Shell.jsx';
import { isOpen } from './lib/rules.js';

const ST = ['submitted', 'under_review', 'more_info_needed', 'shortlisted', 'approved', 'unsuccessful', 'withdrawn'];
const lab = s => s ? s.replace(/_/g, ' ') : '';
const when = d => d ? new Date(d).toLocaleString() : '';

const blank = {
  title: '',
  org: '',
  type: 'Constituency',
  placeType: 'constituency',
  placeName: '',
  min: '',
  max: '',
  levels: ['secondary'],
  opens: '',
  closes: '',
  status: 'published',
  desc: '',
  docs: 'National ID or Birth Certificate, School fee statement',
  how: 'A vetted committee reviews each application fairly based on verified residence and fee need.',
  contact: '',
  q: 'Tell us briefly why you need this bursary.'
};

function Login({ done }) {
  const [e, setE] = useState('');
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!e || !/\S+@\S+\.\S+/.test(e)) {
      return setErr('Please check your email address.');
    }
    setLoading(true);
    setErr('');
    try {
      await ad.sendCode(e);
      setSent(true);
    } catch (x) {
      setErr(x.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const go = async ev => {
    ev.preventDefault();
    if (!sent) {
      return sendOtp();
    }
    setLoading(true);
    setErr('');
    try {
      await ad.signIn(e, c);
      await Promise.all([
        ad.loadBursaries(),
        ad.loadApplications(),
        ad.loadAreaRequests(),
        ad.loadAudit()
      ]);
      done();
    } catch (x) {
      setErr(x.message || "That code didn't match.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm">
      <div className="abody narrow">
        <a className="brand" href="#/">
          <Mark />
          <b>BursaLink</b>
        </a>
        <form className="panel" onSubmit={go}>
          <h1>Staff sign in</h1>
          <p className="muted">For bursary providers, committees, and administrators.</p>

          <label htmlFor="ae">Work email</label>
          <input
            id="ae"
            type="email"
            autoComplete="email"
            value={e}
            disabled={sent}
            placeholder="admin@bursalink.org or official email"
            onChange={x => setE(x.target.value)}
          />

          {sent && (
            <>
              <label htmlFor="ac">One-time code (demo: 123456)</label>
              <input
                id="ac"
                inputMode="numeric"
                autoFocus
                value={c}
                placeholder="123456"
                onChange={x => setC(x.target.value)}
              />
            </>
          )}

          {err && <p className="err" role="alert" style={{ marginTop: '12px' }}>{err}</p>}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : sent ? 'Sign in' : 'Send code'}
            </button>

            {sent && (
              <button
                type="button"
                className="btn2"
                onClick={() => { setSent(false); setC(''); setErr(''); }}
              >
                Use a different email
              </button>
            )}
          </div>

          <p className="muted" style={{ marginTop: '20px', marginBottom: '0' }}>
            <a href="#/">Back to the website</a>
          </p>
        </form>
      </div>
    </div>
  );
}

function formatAudit(x) {
  let label = x.action || 'Activity';
  let desc = '';
  let isWarn = false;

  let d = x.target;
  if (typeof d === 'string' && (d.startsWith('{') || d.startsWith('['))) {
    try {
      d = JSON.parse(d);
    } catch {
      // keep raw string
    }
  }

  switch (x.action) {
    case 'USER_LOGIN_SUCCESS':
      label = 'Staff Login';
      desc = d?.email ? `${d.email} signed in successfully` : 'User authenticated';
      break;
    case 'OTP_REQUEST':
      label = 'OTP Sent';
      desc = d?.email ? `Verification code sent to ${d.email}` : 'Verification code requested';
      break;
    case 'OTP_VERIFY_FAILED':
      label = 'Login Failed';
      isWarn = true;
      desc = d?.email ? `Verification failed for ${d.email}` : 'Invalid code entered';
      break;
    case 'USER_LOGOUT':
      label = 'User Sign Out';
      desc = d?.email ? `${d.email} logged out` : 'User signed out';
      break;
    case 'APPLICATION_SUBMITTED':
      label = 'Application Submitted';
      desc = d?.ref ? `Submitted ${d.ref}${d.bursaryTitle ? ` for ${d.bursaryTitle}` : ''}` : 'New application submitted';
      break;
    case 'APPLICATION_WITHDRAWN':
      label = 'Application Withdrawn';
      isWarn = true;
      desc = d?.ref ? `Student withdrew application ${d.ref}` : 'Application withdrawn';
      break;
    case 'APPLICATION_STATUS_UPDATED':
      label = 'Status Updated';
      desc = d?.ref ? `Application ${d.ref} marked as ${lab(d.newStatus)}` : 'Status updated';
      break;
    case 'AREA_REGISTERED':
      label = 'Area Locked';
      desc = d?.area?.ward ? `Registered in ward: ${d.area.ward} (${d.area.constituency || ''})` : 'Area registered';
      break;
    case 'AREA_CHANGE_REQUESTED':
      label = 'Transfer Requested';
      desc = d?.targetArea?.ward ? `Requested transfer to ${d.targetArea.ward}` : 'Area change requested';
      break;
    case 'AREA_REQUEST_REVIEWED':
      label = 'Transfer Decision';
      desc = d?.status ? `Area transfer ${d.status}` : 'Area request reviewed';
      break;
    default:
      label = x.action ? x.action.replace(/_/g, ' ') : 'Action';
      if (typeof d === 'object' && d !== null) {
        desc = Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
      } else {
        desc = String(d || '');
      }
      break;
  }

  return { label, desc, isWarn };
}

function AuditList({ items }) {
  if (!items || !items.length) {
    return <p className="muted">No activity recorded yet.</p>;
  }

  return (
    <div className="audit-list">
      {items.map((x, i) => {
        const { label, desc, isWarn } = formatAudit(x);
        return (
          <div className="audit-item" key={x.id || i}>
            <div className="audit-main">
              <div className="audit-head">
                <span className={`audit-badge ${isWarn ? 'warn' : ''}`}>{label}</span>
                <span className="audit-desc">{desc}</span>
              </div>
              <div className="audit-meta">
                <span>By: {x.actor}</span>
              </div>
            </div>
            <span className="audit-time">{when(x.at)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Overview({ B, apps, areaReqs, log }) {
  const T = [
    [B.filter(b => isOpen(b)).length, 'Open bursaries'],
    [apps.length, 'Applications'],
    [apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length, 'Awaiting review'],
    [areaReqs.filter(r => r.status === 'pending').length, 'Area requests']
  ];

  return (
    <>
      <div className="tiles">
        {T.map(([n, l]) => (
          <div className="tile" key={l}>
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <h2>Recent activity (Live Audit Trail)</h2>
      <div className="panel">
        <AuditList items={log.slice(0, 8)} />
      </div>
    </>
  );
}

function Bursaries({ B, apps, bump }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const open = b => {
    setErr('');
    setF({
      ...blank,
      ...b,
      placeType: b.place?.type || 'ward',
      placeName: b.place?.name || '',
      docs: Array.isArray(b.docs) ? b.docs.join(', ') : (b.docs || '')
    });
  };

  const set = (k, v) => setF({ ...f, [k]: v });

  const save = async e => {
    e.preventDefault();
    const n = +f.min;
    const m = +f.max;
    const { placeType, placeName, ...r } = f;

    if (!f.title.trim() || !f.org.trim()) return setErr('Enter a title and a provider.');
    if (!f.opens || !f.closes || f.closes < f.opens) return setErr('The closing date must be on or after the opening date.');
    if (!(m > 0) || n > m) return setErr('Enter amounts where the minimum is not above the maximum.');
    if (!f.levels.length) return setErr('Choose at least one education level.');

    setSaving(true);
    setErr('');
    try {
      await ad.saveBursary({
        ...r,
        min: n,
        max: m,
        docs: f.docs.split(',').map(x => x.trim()).filter(Boolean),
        place: placeName.trim() ? { type: placeType, name: placeName.trim() } : null
      });
      setF(null);
      bump();
    } catch (x) {
      setErr(x.message || 'Failed to save bursary.');
    } finally {
      setSaving(false);
    }
  };

  const st = async (id, v) => {
    try {
      await ad.setBursaryStatus(id, v);
      bump();
    } catch (x) {
      alert(x.message || 'Failed to update status');
    }
  };

  if (f) {
    return (
      <form className="panel" onSubmit={save}>
        <h2>{f.id ? 'Edit bursary' : 'New bursary'}</h2>
        <label htmlFor="t">Title</label>
        <input id="t" value={f.title} onChange={e => set('title', e.target.value)} />
        <label htmlFor="o">Provider</label>
        <input id="o" value={f.org} onChange={e => set('org', e.target.value)} />

        <div className="g2">
          <div>
            <label htmlFor="ty">Provider type</label>
            <select id="ty" value={f.type} onChange={e => set('type', e.target.value)}>
              {['Constituency', 'County', 'Foundation', 'Corporate', 'University', 'NGO'].map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pt">Limited to</label>
            <select id="pt" value={f.placeType} onChange={e => set('placeType', e.target.value)}>
              <option value="ward">Ward</option>
              <option value="constituency">Constituency</option>
              <option value="county">County</option>
            </select>
          </div>
        </div>

        <label htmlFor="pn">Place name (leave empty if open to everyone)</label>
        <input id="pn" value={f.placeName} onChange={e => set('placeName', e.target.value)} />

        <div className="g2">
          <div>
            <label htmlFor="mn">Minimum (KES)</label>
            <input id="mn" inputMode="numeric" value={f.min} onChange={e => set('min', e.target.value)} />
          </div>
          <div>
            <label htmlFor="mx">Maximum (KES)</label>
            <input id="mx" inputMode="numeric" value={f.max} onChange={e => set('max', e.target.value)} />
          </div>
          <div>
            <label htmlFor="op">Opens</label>
            <input id="op" type="date" value={f.opens ? f.opens.slice(0, 10) : ''} onChange={e => set('opens', e.target.value)} />
          </div>
          <div>
            <label htmlFor="cl">Closes</label>
            <input id="cl" type="date" value={f.closes ? f.closes.slice(0, 10) : ''} onChange={e => set('closes', e.target.value)} />
          </div>
        </div>

        <fieldset>
          <legend>Education levels</legend>
          {['secondary', 'college', 'university', 'primary'].map(l => (
            <label className="ck" key={l}>
              <input
                type="checkbox"
                checked={f.levels.includes(l)}
                onChange={e => set('levels', e.target.checked ? [...f.levels, l] : f.levels.filter(x => x !== l))}
              />{' '}
              {l}
            </label>
          ))}
        </fieldset>

        <label htmlFor="d">Description</label>
        <textarea id="d" rows="3" value={f.desc} onChange={e => set('desc', e.target.value)} />
        <label htmlFor="dc">Documents required (comma separated)</label>
        <input id="dc" value={f.docs} onChange={e => set('docs', e.target.value)} />
        <label htmlFor="ct">Contact email</label>
        <input id="ct" type="email" value={f.contact} onChange={e => set('contact', e.target.value)} />

        {err && <p className="err" role="alert" style={{ marginTop: '12px' }}>{err}</p>}

        <div className="acts" style={{ marginTop: '20px' }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save bursary'}
          </button>
          <button className="btn2" type="button" onClick={() => setF(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="bar2">
        <h2>Bursaries</h2>
        <button className="btn" onClick={() => open(blank)}>New bursary</button>
      </div>
      <div className="panel">
        {B.map(b => (
          <div className="rw" key={b.id}>
            <div className="grow">
              <b>{b.title}</b>
              <small>
                {b.org} · {b.place?.name || 'Everyone'} · closes {b.closes} · {apps.filter(a => a.bursary_id === b.id || a.bursaryId === b.id).length} applications
              </small>
            </div>
            <span className={'bdg ' + b.status}>{b.status}</span>
            <div className="acts">
              <button className="btn2" onClick={() => open(b)}>Edit</button>
              {b.status === 'draft' && (
                <button className="btn" onClick={() => st(b.id, 'published')}>Publish</button>
              )}
              {b.status === 'published' && (
                <>
                  <button className="btn2" onClick={() => st(b.id, 'draft')}>Unpublish</button>
                  <button className="btn2" onClick={() => confirm('Close this bursary to new applications?') && st(b.id, 'closed')}>Close</button>
                </>
              )}
              {b.status === 'closed' && (
                <button className="btn2" onClick={() => st(b.id, 'published')}>Reopen</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Applications({ apps, bump }) {
  const [fl, setFl] = useState('');
  const [q, setQ] = useState('');
  const [ref, setRef] = useState(null);
  const [ns, setNs] = useState('under_review');
  const [msg, setMsg] = useState('');
  const [updating, setUpdating] = useState(false);

  const list = apps.filter(a => {
    const titleMatch = (a.bursary_title || a.bursaryTitle || '').toLowerCase();
    const refMatch = (a.ref || '').toLowerCase();
    const emailMatch = (a.applicant_email || '').toLowerCase();
    const query = q.toLowerCase();
    const matchesQuery = refMatch.includes(query) || titleMatch.includes(query) || emailMatch.includes(query);
    const matchesFilter = !fl || a.status === fl;
    return matchesQuery && matchesFilter;
  });

  const a = apps.find(x => x.ref === ref);

  if (a) {
    const done = ['approved', 'unsuccessful', 'withdrawn'].includes(a.status);
    const apply = async () => {
      if (['approved', 'unsuccessful'].includes(ns) && !confirm(`Mark application ${a.ref} as ${lab(ns)}? The student will be notified.`)) {
        return;
      }
      setUpdating(true);
      try {
        await ad.setStatus(a.ref, ns, msg.trim());
        setMsg('');
        bump();
        setRef(null);
      } catch (err) {
        alert(err.message || 'Failed to update application');
      } finally {
        setUpdating(false);
      }
    };

    return (
      <>
        <button className="btn2" onClick={() => setRef(null)}>← All applications</button>
        <div className="panel">
          <h2>{a.bursary_title || a.bursaryTitle}</h2>
          <p>
            <b>{a.ref}</b> <span className="bdg">{lab(a.status)}</span>
          </p>

          <h3>Applicant</h3>
          <p>
            <b>Email:</b> {a.applicant_email || '—'} · <b>Submitted:</b> {when(a.created_at || a.createdAt)}
          </p>

          <h3>Application Answers</h3>
          {a.answers && Object.entries(a.answers).map(([k, v]) => (
            <p key={k}>
              <b>{k}:</b> {typeof v === 'object' ? JSON.stringify(v) : (v || '—')}
            </p>
          ))}

          {done ? (
            <p className="muted" style={{ marginTop: '16px' }}>
              This application has a final status ({lab(a.status)}) and can no longer be updated.
            </p>
          ) : (
            <div style={{ borderTop: '1px solid #e6e8eb', marginTop: '16px', paddingTop: '16px' }}>
              <h3>Committee Status Decision</h3>
              <label htmlFor="ns">New Status</label>
              <select id="ns" value={ns} onChange={e => setNs(e.target.value)}>
                {ST.filter(x => !['submitted', 'withdrawn'].includes(x)).map(x => (
                  <option key={x} value={x}>{lab(x)}</option>
                ))}
              </select>

              <label htmlFor="mg">Committee Note / Notification to Student (optional)</label>
              <textarea id="mg" rows="3" value={msg} onChange={e => setMsg(e.target.value)} />

              <button className="btn" style={{ marginTop: '16px' }} onClick={apply} disabled={updating}>
                {updating ? 'Saving decision...' : 'Save Decision'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Applications Management</h2>
      <div className="g2 f">
        <input
          aria-label="Search"
          placeholder="Search reference, bursary, or email"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select aria-label="Status" value={fl} onChange={e => setFl(e.target.value)}>
          <option value="">All statuses</option>
          {ST.map(x => (
            <option key={x} value={x}>{lab(x)}</option>
          ))}
        </select>
      </div>

      <div className="panel">
        {list.map(x => (
          <button className="rw lnk" key={x.ref} onClick={() => { setRef(x.ref); setNs('under_review'); }}>
            <span className="grow">
              <b>{x.bursary_title || x.bursaryTitle || 'Bursary Application'}</b>
              <small>{x.ref} · {x.applicant_email}</small>
            </span>
            <span className="bdg">{lab(x.status)}</span>
          </button>
        ))}
        {!list.length && <p className="muted">No applications match.</p>}
      </div>
    </>
  );
}

function Requests({ areaReqs, bump }) {
  const d = async (id, status) => {
    try {
      await ad.decideArea(id, status);
      bump();
    } catch (err) {
      alert(err.message || 'Failed to review area request');
    }
  };

  const pending = areaReqs.filter(r => r.status === 'pending');

  return (
    <>
      <h2>Area Change Requests</h2>
      <div className="panel">
        {pending.length ? (
          pending.map(r => (
            <div className="rw" key={r.id}>
              <div className="grow">
                <b>User: {r.user_email || `User #${r.user_id}`}</b>
                <p style={{ margin: '4px 0' }}>
                  Target Area: <b>{r.target_area?.ward || r.target_area?.constituency || JSON.stringify(r.target_area)}</b>
                </p>
                <small>Reason: {r.reason || 'None provided'} · Submitted: {when(r.created_at)}</small>
              </div>
              <div className="acts">
                <button className="btn" onClick={() => d(r.id, 'approved')}>Approve</button>
                <button className="btn2" onClick={() => confirm('Reject this request?') && d(r.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No pending area change requests.</p>
        )}
      </div>
    </>
  );
}

function Audit({ log }) {
  return (
    <>
      <h2>Official Audit Log (Government Compliance)</h2>
      <div className="panel">
        <AuditList items={log} />
      </div>
    </>
  );
}

export default function Admin() {
  const [, bump] = useReducer(x => x + 1, 0);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (ad.session()) {
      ad.loadBursaries().then(bump);
      ad.loadApplications().then(bump);
      ad.loadAreaRequests().then(bump);
      ad.loadAudit().then(bump);
    }
  }, []);

  if (!ad.session()) {
    return <Login done={bump} />;
  }

  const B = ad.bursaries();
  const apps = ad.applications();
  const areaReqs = ad.areaRequests();
  const log = ad.audit();
  const pend = apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length;
  const pendArea = areaReqs.filter(r => r.status === 'pending').length;

  const tabs = [
    ['overview', 'Overview'],
    ['bursaries', 'Bursaries'],
    ['applications', 'Applications' + (pend ? ` (${pend})` : '')],
    ['requests', 'Area requests' + (pendArea ? ` (${pendArea})` : '')],
    ['audit', 'Audit log']
  ];

  const handleSignOut = async () => {
    await ad.signOut();
    bump();
  };

  return (
    <div className="adm">
      <header className="atop">
        <div className="ain">
          <a className="brand" href="#/">
            <Mark />
            <b>BursaLink Staff</b>
          </a>
          <span className="who">{ad.session()?.email}</span>
          <div className="grow" />
          <nav className="tabs">
            {tabs.map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </nav>
          <button className="btn2" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main className="abody">
        {tab === 'overview' && <Overview B={B} apps={apps} areaReqs={areaReqs} log={log} />}
        {tab === 'bursaries' && <Bursaries B={B} apps={apps} bump={bump} />}
        {tab === 'applications' && <Applications apps={apps} bump={bump} />}
        {tab === 'requests' && <Requests areaReqs={areaReqs} bump={bump} />}
        {tab === 'audit' && <Audit log={log} />}
      </main>
    </div>
  );
}
