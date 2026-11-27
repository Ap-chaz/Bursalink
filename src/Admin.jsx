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

function PasswordField({ id, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
      <button
        type="button"
        className="pw-toggle"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(s => !s)}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function Login({ done }) {
  const [stage, setStage] = useState('creds'); // 'creds' | 'otp'
  const [e, setE] = useState('');
  const [pw, setPw] = useState('');
  const [c, setC] = useState('');
  const [challenge, setChallenge] = useState('');
  const [purpose, setPurpose] = useState('login');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAll = () =>
    Promise.all([
      ad.loadBursaries(),
      ad.loadApplications(),
      ad.loadAreaRequests(),
      ad.loadAudit()
    ]);

  const go = async ev => {
    ev.preventDefault();
    setErr('');
    setOk('');

    if (stage === 'creds') {
      if (!e || !/\S+@\S+\.\S+/.test(e)) return setErr('Please enter a valid work email.');
      if (!pw) return setErr('Password is required.');
      setLoading(true);
      try {
        const res = await ad.login(e, pw);
        if (res?.step === 'otp') {
          setChallenge(res.challenge);
          setPurpose(res.purpose || 'login');
          setC('');
          setStage('otp');
        } else {
          await loadAll();
          done();
        }
      } catch (x) {
        setErr(x.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (stage === 'otp') {
      setLoading(true);
      try {
        await ad.verifyOtp({ challenge, code: c, purpose });
        await loadAll();
        done();
      } catch (x) {
        setErr(x.message || 'Invalid or expired verification code.');
      } finally {
        setLoading(false);
      }
    }
  };

  const resend = async () => {
    setErr('');
    setOk('');
    setLoading(true);
    try {
      const res = await ad.resendOtp({ challenge, purpose });
      if (res?.challenge) setChallenge(res.challenge);
      setOk('A new 6-digit verification code has been sent.');
    } catch (x) {
      setErr(x.message || 'Could not resend verification code.');
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
          {stage === 'creds' && (
            <>
              <h1>Staff sign in</h1>
              <p className="muted">For bursary providers, committees, and administrators. Two-step verification is required.</p>
              {ok && <p className="ok" role="status">{ok}</p>}

              <label htmlFor="ae">Work email</label>
              <input
                id="ae"
                type="email"
                autoComplete="email"
                value={e}
                placeholder="admin@bursalink.org or official email"
                onChange={x => setE(x.target.value)}
              />

              <label htmlFor="apw">Password</label>
              <PasswordField
                id="apw"
                autoComplete="current-password"
                value={pw}
                placeholder="Enter your staff password"
                onChange={x => setPw(x.target.value)}
              />

              {err && <p className="err" role="alert" style={{ marginTop: '12px' }}>{err}</p>}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <button className="btn" type="submit" disabled={loading || !e.trim() || !pw}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </>
          )}

          {stage === 'otp' && (
            <>
              <h1>Two-factor verification</h1>
              <p className="muted">Enter the 6-digit verification code sent to <b>{e}</b>.</p>
              {ok && <p className="ok" role="status">{ok}</p>}

              <label htmlFor="ac">6-digit verification code</label>
              <input
                id="ac"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={c}
                onChange={x => setC(x.target.value.replace(/\D/g, '').slice(0, 6))}
              />

              {err && <p className="err" role="alert" style={{ marginTop: '12px' }}>{err}</p>}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <button className="btn" type="submit" disabled={loading || c.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify & sign in'}
                </button>
                <button type="button" className="btn2" disabled={loading} onClick={resend}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="btn2"
                  disabled={loading}
                  onClick={() => { setStage('creds'); setC(''); setErr(''); setOk(''); }}
                >
                  Back
                </button>
              </div>
            </>
          )}

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
    case 'USER_REGISTERED':
      label = 'Student Registered';
      desc = d?.email ? `${d.email} created an account` : 'New student account';
      break;
    case 'REGISTER_REJECTED':
      label = 'Sign-up Rejected';
      isWarn = true;
      desc = d?.email ? `Sign-up blocked for existing/staff email ${d.email}` : 'Sign-up rejected';
      break;
    case 'USER_LOGIN_SUCCESS':
      label = 'Login Success';
      desc = d?.email ? `${d.email} (${d.role || 'user'}) signed in` : 'User authenticated';
      break;
    case 'LOGIN_FAILED':
      label = 'Login Failed';
      isWarn = true;
      desc = d?.email ? `Failed login for ${d.email} (${d.reason || 'invalid credentials'})` : 'Failed login attempt';
      break;
    case 'LOGIN_BLOCKED_LOCKED':
    case 'ACCOUNT_LOCKED':
      label = 'Account Locked';
      isWarn = true;
      desc = d?.email ? `${d.email} temporarily locked after failed attempts` : 'Account locked';
      break;
    case 'OTP_REQUEST':
      label = 'OTP Sent';
      desc = d?.email ? `Verification code (${d.purpose || 'auth'}) sent to ${d.email}` : 'Verification code requested';
      break;
    case 'OTP_VERIFY_FAILED':
      label = 'OTP Failed';
      isWarn = true;
      desc = d?.purpose ? `Invalid or expired code (${d.purpose})` : 'Invalid code entered';
      break;
    case 'PASSWORD_RESET':
      label = 'Password Reset';
      desc = d?.email ? `${d.email} reset password` : 'Password reset via OTP';
      break;
    case 'PASSWORD_CHANGED':
      label = 'Password Changed';
      desc = 'User updated password (other sessions revoked)';
      break;
    case 'PASSWORD_CHANGE_FAILED':
      label = 'Password Check Failed';
      isWarn = true;
      desc = 'Incorrect current password on password change';
      break;
    case 'ACCOUNT_DELETED':
      label = 'Account Deleted';
      isWarn = true;
      desc = d?.email ? `${d.email} deleted account` : 'Account deleted';
      break;
    case 'ACCOUNT_DELETE_FAILED':
      label = 'Delete Failed';
      isWarn = true;
      desc = 'Incorrect password supplied for account deletion';
      break;
    case 'ADMIN_PROVISIONED':
      label = 'Admin Provisioned';
      desc = d?.email ? `Admin account configured for ${d.email}` : 'Admin provisioned';
      break;
    case 'ADMIN_RESET_BLOCKED':
      label = 'Admin Reset Blocked';
      isWarn = true;
      desc = d?.email ? `Blocked self-service password reset for staff account ${d.email}` : 'Admin reset blocked';
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

          <h3>Applicant Documents</h3>
          {a.applicant_docs && Object.keys(a.applicant_docs).length > 0 ? (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {Object.entries(a.applicant_docs).map(([docName, docData]) => (
                <div key={docName} style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <b>{docName}</b>
                    <span className="muted" style={{ marginLeft: '8px', fontSize: '13px' }}>
                      {docData?.name || 'Uploaded file'} {docData?.size ? `(${(docData.size / 1024).toFixed(0)} KB)` : ''}
                    </span>
                  </div>
                  {docData?.url ? (
                    <a href={docData.url} target="_blank" rel="noopener noreferrer" className="btn2" style={{ textDecoration: 'none', display: 'inline-block', padding: '4px 10px', fontSize: '13px' }}>
                      Open Document ↗
                    </a>
                  ) : (
                    <span className="muted" style={{ fontSize: '13px' }}>Uploaded</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: '16px' }}>No attached documents found for this applicant.</p>
          )}

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

function StaffSecurity() {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const submit = async ev => {
    ev.preventDefault();
    setErr('');
    setOk('');
    if (newPw !== newPw2) return setErr('New passwords do not match.');
    setBusy(true);
    try {
      await ad.changePassword({ currentPassword: curPw, newPassword: newPw });
      setCurPw('');
      setNewPw('');
      setNewPw2('');
      setOk('Staff password updated. Any other active sessions have been signed out.');
    } catch (x) {
      setErr(x.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" style={{ maxWidth: '520px' }} onSubmit={submit}>
      <h2>Account security</h2>
      <p className="muted">Update your staff password. You will still verify with a 6-digit email code when signing in.</p>
      <label htmlFor="adm-cur">Current password</label>
      <PasswordField id="adm-cur" autoComplete="current-password" value={curPw} onChange={e => setCurPw(e.target.value)} />
      <label htmlFor="adm-new">New password</label>
      <PasswordField id="adm-new" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} />
      <small className="hint">At least 10 characters, including letters and a number or symbol.</small>
      <label htmlFor="adm-new2">Confirm new password</label>
      <PasswordField id="adm-new2" autoComplete="new-password" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
      {err && <p className="err" role="alert" style={{ marginTop: '12px' }}>{err}</p>}
      {ok && <p className="ok" role="status" style={{ marginTop: '12px' }}>{ok}</p>}
      <div className="acts">
        <button className="btn" type="submit" disabled={busy || !curPw || !newPw || !newPw2}>
          {busy ? 'Updating...' : 'Update staff password'}
        </button>
      </div>
    </form>
  );
}

export default function Admin() {
  const [, bump] = useReducer(x => x + 1, 0);
  const [tab, setTab] = useState('overview');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await ad.checkSession();
      if (user) {
        await Promise.all([
          ad.loadBursaries(),
          ad.loadApplications(),
          ad.loadAreaRequests(),
          ad.loadAudit()
        ]);
      }
      if (alive) {
        setChecking(false);
        bump();
      }
    })();
    return () => { alive = false; };
  }, []);

  if (checking) {
    return (
      <div className="adm">
        <div className="abody narrow">
          <div className="panel"><p className="muted">Checking staff session...</p></div>
        </div>
      </div>
    );
  }

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
    ['audit', 'Audit log'],
    ['security', 'Security']
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
        {tab === 'security' && <StaffSecurity />}
      </main>
    </div>
  );
}
