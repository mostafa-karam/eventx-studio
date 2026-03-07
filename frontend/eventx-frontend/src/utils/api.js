import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

let csrfToken = null;

export const fetchCsrfToken = async () => {
    try {
        const response = await api.get('/auth/csrf-token');
        if (response.data.success) {
            csrfToken = response.data.csrfToken;
        }
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
};

api.interceptors.request.use(async (config) => {
    // Only attach CSRF token to mutations
    const requiresCsrf = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());

    if (requiresCsrf) {
        if (!csrfToken) {
            // If we don't have a token yet, try to fetch one before proceeding.
            await fetchCsrfToken();
        }
        if (csrfToken) {
            config.headers['CSRF-Token'] = csrfToken;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
