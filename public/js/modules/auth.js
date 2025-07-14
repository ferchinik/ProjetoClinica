/**
 * Authentication module - Handles authentication and security
 */
import { showNotification } from '../notification.js';

/**
 * Checks if the user is authenticated
 * @returns {boolean} Whether the user is authenticated
 */
export function checkAuth() {
    const isLoginPage = window.location.pathname.endsWith('/login.html');
    const isRegisterPage = window.location.pathname.endsWith('/registro.html');
    
    if (isLoginPage || isRegisterPage) return true;
    
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
        console.log("[Auth] Usuário não autenticado. Redirecionando para login.html");
        window.location.href = 'login.html';
        return false;
    }
    
    console.log("[Auth] Usuário autenticado.");
    return true;
}

/**
 * Handles user logout
 * @param {Event} event - The event object
 * @returns {boolean} Always returns false to prevent default behavior
 */
export function handleLogout(event) {
    if (event) event.preventDefault();
    console.log("[Logout] Iniciando processo de logout...");
    showNotification('Saindo...', 'info');

    fetch('/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-CSRF-Token': sessionStorage.getItem('csrfToken') || '',
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            console.warn("[Logout] Resposta não OK do servidor ao tentar fazer logout:", response.status);
        }
        return response.text();
    })
    .catch(error => {
        console.error('[Logout] Erro na requisição fetch para /logout:', error);
    })
    .finally(() => {
        // Clear sensitive data from storage
        sessionStorage.clear();
        localStorage.removeItem('theme');
        
        // Clear any cached data
        if (caches && caches.keys) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        console.log("[Logout] Sessão e localStorage limpos. Redirecionando para login.html");
        window.location.href = 'login.html';
    });
    
    return false;
}

/**
 * Sets up security headers for fetch requests
 * @returns {Object} Headers object with security headers
 */
export function getSecureHeaders() {
    return {
        'X-CSRF-Token': sessionStorage.getItem('csrfToken') || '',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
}

/**
 * Creates a secure fetch wrapper with proper headers and error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
export function secureFetch(url, options = {}) {
    // Add security headers
    const headers = {
        ...getSecureHeaders(),
        ...(options.headers || {})
    };
    
    // Add credentials
    const secureOptions = {
        ...options,
        credentials: 'include',
        headers
    };
    
    // Add timestamp to prevent caching for GET requests
    const secureUrl = options.method === 'GET' || !options.method ? 
        `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : url;
    
    return fetch(secureUrl, secureOptions)
        .then(response => {
            if (!response.ok) {
                // Handle session timeout
                if (response.status === 401) {
                    showNotification('Sua sessão expirou. Por favor, faça login novamente.', 'warning');
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                    throw new Error('Session expired');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        });
}

/**
 * Initializes security features
 */
export function initSecurity() {
    // Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Set up session timeout monitoring
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    let sessionTimeoutId;
    
    const resetSessionTimeout = () => {
        clearTimeout(sessionTimeoutId);
        sessionTimeoutId = setTimeout(() => {
            showNotification('Sua sessão expirou por inatividade. Por favor, faça login novamente.', 'warning');
            handleLogout();
        }, sessionTimeout);
    };
    
    // Reset timeout on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetSessionTimeout);
    });
    
    // Initial timeout setup
    resetSessionTimeout();
}
