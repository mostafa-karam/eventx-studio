/**
 * Centralized API Client
 * 
 * Provides a consistent interface for all API calls with:
 * - Automatic CSRF token injection
 * - Credential inclusion (httpOnly cookies)
 * - Consistent error handling and JSON parsing
 * - Session expiry detection (401)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let csrfToken = null;

/**
 * Update the CSRF token used by all requests
 */
export const setCsrfToken = (token) => {
  csrfToken = token;
};

/**
 * Get the current CSRF token
 */
export const getCsrfToken = () => csrfToken;

/**
 * Fetch a fresh CSRF token from the server
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return data.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
};

/**
 * Core request function
 * @param {string} endpoint - API path (e.g. '/auth/login')
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.body]
 * @param {object} [options.headers]
 * @param {boolean} [options.raw=false] - If true, return raw Response instead of parsed JSON
 * @returns {Promise<{success: boolean, data?: any, message?: string, status: number}>}
 */
const request = async (endpoint, { method = 'GET', body, headers = {}, raw = false } = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add CSRF token for state-mutating requests
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  if (isMutation) {
    const token = csrfToken || await fetchCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }

  // Attach body (skip for GET/HEAD)
  if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  // Handle session expiry
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register') && !endpoint.includes('/auth/csrf-token')) {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }

  if (raw) return response;

  // Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch {
    return {
      success: false,
      status: response.status,
      message: 'Server returned an invalid response',
    };
  }

  return {
    ...data,
    status: response.status,
    ok: response.ok,
  };
};

/**
 * Upload files with FormData (multipart)
 * @param {string} endpoint
 * @param {FormData} formData
 * @returns {Promise<object>}
 */
const upload = async (endpoint, formData) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = csrfToken || await fetchCsrfToken();

  const config = {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: {},
  };

  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }

  const response = await fetch(url, config);
  const data = await response.json();
  return { ...data, status: response.status, ok: response.ok };
};

// ─── Convenience Methods ─────────────────────────────────────────────
const api = {
  get: (endpoint, opts) => request(endpoint, { ...opts, method: 'GET' }),
  post: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'POST', body }),
  put: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'PUT', body }),
  patch: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'PATCH', body }),
  delete: (endpoint, body, opts) => request(endpoint, { ...opts, method: 'DELETE', body }),
  upload,
  setCsrfToken,
  getCsrfToken,
  fetchCsrfToken,
};

export default api;
