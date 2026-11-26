// Real Admin API Client connecting directly to Express & MySQL backend via HttpOnly session cookies
import { BURSARIES as DEFAULT_BURSARIES } from './data.js';

const S_KEY = 'bursalink-admin-session';
const API_BASE = '/api';

const rd = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const wr = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let cachedBursaries = DEFAULT_BURSARIES;
let cachedApps = [];
let cachedAreaReqs = [];
let cachedAudit = [];

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
    if (response.status === 401 || response.status === 403) {
      if (endpoint.includes('/admin/') || endpoint === '/auth/me') {
        localStorage.removeItem(S_KEY);
      }
    }
    throw new Error(data.error || response.statusText || 'Request failed');
  }

  return data;
}

export const session = () => rd(S_KEY, null);

export const login = async (email, password) => {
  if (!/\S+@\S+\.\S+/.test(email)) throw new Error('Please enter a valid work email.');
  if (!password) throw new Error('Password is required.');

  const res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password, portal: 'admin' })
  });

  if (res.step === 'otp') {
    return res;
  }

  if (res.user?.role !== 'admin') {
    await req('/auth/logout', { method: 'POST' }).catch(() => {});
    throw new Error('Access denied: This email is not authorized as administrative staff.');
  }

  wr(S_KEY, { email: res.user.email, role: res.user.role, id: res.user.id });
  return res;
};

export const verifyOtp = async ({ challenge, code, purpose }) => {
  const res = await req('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ challenge, code: String(code || '').trim(), purpose })
  });

  if (res.user?.role !== 'admin') {
    await req('/auth/logout', { method: 'POST' }).catch(() => {});
    throw new Error('Access denied: This email is not authorized as administrative staff.');
  }

  wr(S_KEY, { email: res.user.email, role: res.user.role, id: res.user.id });
  return res.user;
};

export const resendOtp = async ({ challenge, purpose }) => {
  return await req('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ challenge, purpose })
  });
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  return await req('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

export const checkSession = async () => {
  try {
    const res = await req('/auth/me');
    if (res?.user?.role === 'admin') {
      wr(S_KEY, { email: res.user.email, role: res.user.role, id: res.user.id });
      return res.user;
    }
    localStorage.removeItem(S_KEY);
    return null;
  } catch {
    localStorage.removeItem(S_KEY);
    return null;
  }
};

export const signOut = async () => {
  await req('/auth/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem(S_KEY);
};

export const bursaries = () => cachedBursaries;

export const loadBursaries = async () => {
  try {
    const data = await req('/bursaries');
    if (Array.isArray(data)) {
      cachedBursaries = data;
    }
  } catch (err) {
    console.warn('Failed to load bursaries from API:', err.message);
  }
  return cachedBursaries;
};

export const applications = () => cachedApps;

export const loadApplications = async () => {
  try {
    const data = await req('/applications/admin/all');
    if (Array.isArray(data)) {
      cachedApps = data;
    }
  } catch (err) {
    console.warn('Failed to load applications from API:', err.message);
  }
  return cachedApps;
};

export const areaRequests = () => cachedAreaReqs;

export const loadAreaRequests = async () => {
  try {
    const data = await req('/profile/admin/area-requests');
    if (Array.isArray(data)) {
      cachedAreaReqs = data;
    }
  } catch (err) {
    console.warn('Failed to load area requests from API:', err.message);
  }
  return cachedAreaReqs;
};

export const audit = () => cachedAudit;

export const loadAudit = async () => {
  try {
    const data = await req('/profile/admin/audit');
    if (Array.isArray(data)) {
      cachedAudit = data;
    }
  } catch (err) {
    console.warn('Failed to load audit logs from API:', err.message);
  }
  return cachedAudit;
};

export const saveBursary = async b => {
  if (b.id && !b.id.startsWith('new_')) {
    await req(`/bursaries/${b.id}`, {
      method: 'PUT',
      body: JSON.stringify(b)
    });
  } else {
    const newId = 'b_' + Date.now();
    await req('/bursaries', {
      method: 'POST',
      body: JSON.stringify({ ...b, id: newId })
    });
  }
  await loadBursaries();
};

export const setBursaryStatus = async (id, status) => {
  await req(`/bursaries/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  await loadBursaries();
};

export const setStatus = async (ref, status, note = '') => {
  await req(`/applications/admin/${ref}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note })
  });
  await Promise.all([loadApplications(), loadAudit()]);
};

export const decideArea = async (requestId, status) => {
  // status: 'approved' or 'rejected'
  await req(`/profile/admin/area-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  await Promise.all([loadAreaRequests(), loadAudit()]);
};
