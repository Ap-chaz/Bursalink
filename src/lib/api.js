import { BURSARIES as DEFAULT_BURSARIES } from './data.js';

const K = 'bursalink';
const RAW_API_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '';
const API_BASE = RAW_API_URL
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL.replace(/\/+$/, '') : `${RAW_API_URL.replace(/\/+$/, '')}/api`)
  : '/api';

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

// Initialize cached UI state (never stores auth tokens or secrets)
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

async function req(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'bursalink',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      response.status === 401 &&
      !['/auth/login', '/auth/register', '/auth/change-password', '/auth/account'].includes(endpoint)
    ) {
      upd(s => { s.user = null; });
    }
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

export const register = async ({ name, email, password }) => {
  return await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
};

export const login = async ({ email, password }) => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, portal: 'student' })
  });

  if (res.step === 'otp') {
    return res;
  }

  upd(s => {
    s.user = res.user;
  });

  await syncUserData();
  return res;
};

export const verifyOtp = async ({ challenge, code, purpose }) => {
  const res = await req('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ challenge, code, purpose })
  });

  if (res.user?.role && res.user.role !== 'student') {
    await req('/auth/logout', { method: 'POST' }).catch(() => {});
    upd(s => { s.user = null; });
    throw new Error('Staff accounts must sign in through the staff portal.');
  }

  upd(s => {
    s.user = res.user;
  });

  await syncUserData();
  return res;
};

export const resendOtp = async ({ challenge, purpose }) => {
  return await req('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ challenge, purpose })
  });
};

export const forgotPassword = async email => {
  return await req('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const resetPassword = async ({ challenge, code, newPassword }) => {
  return await req('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ challenge, code, newPassword })
  });
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  return await req('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

export async function checkSession() {
  try {
    const res = await req('/auth/me');
    if (res?.user?.role === 'student') {
      upd(s => {
        s.user = res.user;
        if (res.profile?.lang) {
          s.profile = { ...s.profile, lang: res.profile.lang };
        }
      });
      await syncUserData();
      return res.user;
    }
    upd(s => { s.user = null; });
    return null;
  } catch {
    upd(s => { s.user = null; });
    return null;
  }
}

export async function syncUserData() {
  if (!load().user) return;

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
  const keys = Object.keys(patch || {});
  if (!load().user && keys.length === 1 && keys[0] === 'lang') {
    upd(s => {
      s.profile = { ...s.profile, lang: patch.lang };
    });
    return;
  }

  await req('/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  upd(s => {
    s.profile = { ...s.profile, ...patch };
  });
};

export const uploadDocument = async file => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload/doc`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Requested-With': 'bursalink',
      'ngrok-skip-browser-warning': 'true'
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Document upload failed');
  }
  return data;
};

export const deleteUploadedDocument = async publicId => {
  return await req('/upload', {
    method: 'DELETE',
    body: JSON.stringify({ publicId })
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
  const lang = load().profile.lang;
  save({ ...blank, profile: { ...blank.profile, lang } });
};

export const deleteAccount = async password => {
  await req('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password })
  });
  save({ ...blank });
};
