/**
 * apiUtils.js
 * 
 * Global fetch wrapper to automatically handle CSRF tokens for state-mutating requests
 * (POST, PUT, DELETE, PATCH). It fetches the token if it's not cached and attaches it
 * to the headers.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
let csrfTokenCache = null;

/**
 * Fetches the CSRF token from the backend.
 * @returns {Promise<string|null>} The CSRF token.
 */
export const getCsrfToken = async () => {
    if (csrfTokenCache) return csrfTokenCache;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.csrfToken) {
                csrfTokenCache = data.csrfToken;
                return csrfTokenCache;
            }
        }
        console.warn('Failed to retrieve CSRF token.');
        return null;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        return null;
    }
};

/**
 * Enhanced fetch function that automatically injects the CSRF token.
 * 
 * @param {string} url - The request URL.
 * @param {RequestInit} options - Standard fetch options.
 * @returns {Promise<Response>} The fetch Response object.
 */
export const apiFetch = async (url, options = {}) => {
    const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase());

    // Ensure headers exist
    options.headers = options.headers || {};

    // Always include credentials for secure HttpOnly cookie transmission
    options.credentials = options.credentials || 'include';

    if (isMutatingRequest) {
        const token = await getCsrfToken();
        if (token) {
            options.headers['X-CSRF-Token'] = token;
        }
    }

    return fetch(url, options);
};

export default apiFetch;
