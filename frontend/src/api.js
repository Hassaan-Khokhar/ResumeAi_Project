const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return { 'Authorization': `Bearer ${token}` };
}

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

// Auth
export const authAPI = {
  register: (body) => fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  login: (body) => fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
};

// Posts
export const postsAPI = {
  getFeed: (skip = 0) => request(`/posts/feed?skip=${skip}`),
  create: (body) => request('/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id, body) => request(`/posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (postId, skip = 0, limit = 10) => request(`/posts/${postId}/comments?skip=${skip}&limit=${limit}`),
  addComment: (id, text, parent_id = null) => request(`/posts/${id}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, parent_id }) }),
  deleteComment: (postId, commentId) => request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  likeComment: (postId, commentId) => request(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),
};

// Jobs
export const jobsAPI = {
  list: (skip = 0, search = '') => request(`/jobs/?skip=${skip}&search=${search}`),
  get: (id) => request(`/jobs/${id}`),
  create: (body) => request('/jobs/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id, body) => request(`/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
  applicants: (id) => request(`/jobs/${id}/applicants`),
  checkCompatibility: (jobId, formData) => fetch(`${API}/jobs/${jobId}/check-compatibility`, { method: 'POST', headers: getHeaders(), body: formData }).then(r => r.json()),
  // Applications
  apply: (jobId, formData) => fetch(`${API}/jobs/${jobId}/apply`, { method: 'POST', headers: getHeaders(), body: formData }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Apply failed'); return d; }),
  applyForm: (jobId, formData) => fetch(`${API}/jobs/${jobId}/apply-form`, { method: 'POST', headers: getHeaders(), body: formData }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Apply failed'); return d; }),
  getApplications: (jobId) => request(`/jobs/${jobId}/applications`),
  getResume: (jobId, appId) => request(`/jobs/${jobId}/applications/${appId}/resume`),
  updateStatus: (jobId, appId, status) => {
    const fd = new FormData(); fd.append('status', status);
    return fetch(`${API}/jobs/${jobId}/applications/${appId}/status`, { method: 'PUT', headers: getHeaders(), body: fd }).then(r => r.json());
  },
  myJobs: () => request('/jobs/dashboard/my-jobs'),
};

// AI Analysis
export const analyzeAPI = {
  analyze: (formData) => fetch(`${API}/analyze/`, { method: 'POST', headers: getHeaders(), body: formData }).then(r => r.json()),
  history: () => request('/analyze/history'),
};

// Users
export const usersAPI = {
  me: () => request('/users/me'),
  profile: (id) => request(`/users/profile/${id}`),
  updateProfile: (body) => request('/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  followers: (id) => request(`/users/${id}/followers`),
  following: (id) => request(`/users/${id}/following`),
  getRecommendations: () => request('/users/recommendations'),
  // Education CRUD
  addEducation: (body) => request('/users/education', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  updateEducation: (id, body) => request(`/users/education/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteEducation: (id) => request(`/users/education/${id}`, { method: 'DELETE' }),
  // Experience CRUD
  addExperience: (body) => request('/users/experience', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  updateExperience: (id, body) => request(`/users/experience/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteExperience: (id) => request(`/users/experience/${id}`, { method: 'DELETE' }),
  // Search
  globalSearch: (q) => request(`/users/search/global?q=${encodeURIComponent(q)}`),
  // Stats
  trendingSkills: () => request('/users/stats/trending-skills'),
  platformStats: () => request('/users/stats/platform'),
};
