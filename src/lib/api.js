import { BURSARIES as DEFAULT_BURSARIES } from './data.js';

const K = 'bursalink';
const TOKEN_KEY = 'bursalink_token';
const API_BASE = '/api';

const blank = {
  user: null,
  profile: { docs: {}, notify: { status: true, deadline: true, match: true }, saver: false, lang: 'en' },
  apps: [],
  drafts: {},
  saved: [],
  notifs: [],
  areaReq: null,
  seq: 0
};

let cachedBursaries = DEFAULT_BURSARIES.filter(b => b.status !== 'draft');

// Initialize cached state
export const load = () => {
  try {
    const raw = localStorage.getItem(K);
    return raw ? { ...blank, ...JSON.parse(raw) } : { ...blank };
  } catch {
    return { ...blank };
  }
};

const save = s => {
  localStorage.setItem(K, JSON.stringify(s));
  return s;
};

const upd = fn => {
  const s = load();
  fn(s);
  return save(s);
};

export const mutate = upd;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = token => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

async function req(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || response.statusText || 'Request failed');
  }

  return data;
}

// Fetch bursaries from API (falls back to DEFAULT_BURSARIES)
export const listBursaries = () => cachedBursaries;

export async function syncBursaries() {
  try {
    const data = await req('/bursaries');
    if (Array.isArray(data) && data.length > 0) {
      cachedBursaries = data;
    }
  } catch (err) {
    console.warn('Failed to sync bursaries from backend, using default cache:', err.message);
  }
  return cachedBursaries;
}

// Immediately attempt bursaries sync
syncBursaries();

export const sendCode = async email => {
  if (!/\S+@\S+\.\S+/.test(email)) throw new Error('email');
  await req('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const verifyCode = async (email, code) => {
  const res = await req('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });

  setToken(res.token);

  upd(s => {
    s.user = res.user;
  });

  await syncUserData();
};

export async function syncUserData() {
  if (!getToken()) return;

  try {
    const [profileData, appsData, draftsData, notifsData, savedData] = await Promise.all([
      req('/profile').catch(() => null),
      req('/applications').catch(() => []),
      req('/applications/drafts').catch(() => ({})),
      req('/notifications').catch(() => []),
      req('/notifications/saved').catch(() => [])
    ]);

    upd(s => {
      if (profileData?.profile) {
        s.profile = { ...s.profile, ...profileData.profile };
      }
      if (profileData?.areaReq !== undefined) {
        s.areaReq = profileData.areaReq;
      }
      if (Array.isArray(appsData)) {
        s.apps = appsData;
      }
      if (draftsData && typeof draftsData === 'object') {
        s.drafts = draftsData;
      }
      if (Array.isArray(notifsData)) {
        s.notifs = notifsData;
      }
      if (Array.isArray(savedData)) {
        s.saved = savedData;
      }
    });
  } catch (err) {
    console.warn('Sync user data failed:', err);
  }
}

export const updateProfile = async patch => {
  await req('/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  upd(s => {
    s.profile = { ...s.profile, ...patch };
  });
};

export const registerArea = async area => {
  await req('/profile/area', {
    method: 'POST',
    body: JSON.stringify({ area })
  });
  upd(s => {
    s.profile.area = area;
  });
};

export const requestAreaChange = async (area, reason) => {
  await req('/profile/area-change', {
    method: 'POST',
    body: JSON.stringify({ area, reason })
  });
  upd(s => {
    s.areaReq = { area, reason, status: 'pending', created_at: new Date().toISOString() };
  });
};

export const toggleSave = async id => {
  const res = await req(`/notifications/saved/${id}/toggle`, {
    method: 'POST'
  });
  upd(s => {
    s.saved = res.saved || (s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id]);
  });
};

export const saveDraft = async (id, data) => {
  await req('/applications/drafts', {
    method: 'POST',
    body: JSON.stringify({ bursaryId: id, data })
  });
  upd(s => {
    s.drafts[id] = data;
  });
};

export const submitApplication = async (id, answers) => {
  const res = await req('/applications', {
    method: 'POST',
    body: JSON.stringify({ bursaryId: id, answers })
  });

  const ref = res.ref || res.id;

  upd(s => {
    s.apps.unshift({
      id: ref,
      ref,
      bursaryId: id,
      answers,
      status: 'submitted',
      history: [{ status: 'submitted', at: new Date().toISOString() }],
      messages: []
    });
    delete s.drafts[id];
    s.notifs.unshift({
      id: 'notif_' + Date.now(),
      text: `Application ${ref} submitted`,
      go: { view: 'app', id: ref },
      at: new Date().toISOString(),
      read: false
    });
  });
};

export const withdraw = async ref => {
  await req(`/applications/${ref}/withdraw`, {
    method: 'POST'
  });

  upd(s => {
    const a = s.apps.find(x => x.ref === ref);
    if (a) {
      a.status = 'withdrawn';
      a.history.push({ status: 'withdrawn', at: new Date().toISOString() });
    }
  });
};

export const markAllRead = async () => {
  await req('/notifications/mark-all-read', {
    method: 'POST'
  });
  upd(s => {
    s.notifs.forEach(n => { n.read = true; });
  });
};

export const markRead = async id => {
  await req(`/notifications/${id}/read`, {
    method: 'POST'
  });
  upd(s => {
    const n = s.notifs.find(x => x.id === id);
    if (n) n.read = true;
  });
};

export const trackApplication = async ref => {
  return await req(`/applications/track/${encodeURIComponent(ref.trim())}`);
};

export const logout = async () => {
  await req('/auth/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
  upd(s => {
    s.user = null;
  });
};

export const deleteAccount = async () => {
  setToken(null);
  save({ ...blank });
};
