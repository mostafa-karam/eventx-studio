/**
 * Global CSRF Protection Utility
 * 
 * This module monkey-patches the global fetch function to automatically
 * include the X-CSRF-Token header in all state-mutating requests to the API.
 */

let globalCsrfToken = null;

/**
 * Update the global CSRF token used by fetch
 * @param {string} token 
 */
export const setGlobalCsrfToken = (token) => {
    globalCsrfToken = token;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const originalFetch = window.fetch;

window.fetch = async function (...args) {
    let [url, config] = args;

    // Ensure config exists
    config = config || {};

    // Normalize headers
    const headers = config.headers ? (config.headers instanceof Headers ? config.headers : new Headers(config.headers)) : new Headers();

    const method = (config.method || 'GET').toUpperCase();
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    // Check if it's an API call to our backend
    const urlString = url.toString();
    const isApiCall = urlString.startsWith(API_BASE_URL) || urlString.startsWith('/api') || !urlString.startsWith('http');

    if (isApiCall) {
        // Guarantee cookies are transmitted
        config.credentials = config.credentials || 'include';

        if (isMutation && globalCsrfToken) {
            // Only set if not already set manually
            if (!headers.has('X-CSRF-Token')) {
                headers.set('X-CSRF-Token', globalCsrfToken);
            }
        }
    }

    // Update config with normalized headers
    // If original headers were a plain object, we should ideally convert back, 
    // but fetch accepts Headers objects too.
    config.headers = headers;

    return originalFetch(url, config).then(response => {
        // Intercept 401 responses to handle session expiry automatically
        if (response.status === 401 && isApiCall && !urlString.includes('/auth/login') && !urlString.includes('/auth/register') && !urlString.includes('/auth/csrf-token')) {
            window.dispatchEvent(new CustomEvent('session-expired'));
        }
        return response;
    });
};

if (import.meta.env.DEV) {
    console.log('Global CSRF fetch interceptor initialized');
}
