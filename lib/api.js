// lib/api.js

const configuredApiBase = process.env.EXPO_PUBLIC_API_BASE;
export const API_BASE = (configuredApiBase || (__DEV__ ? 'http://192.168.1.91/qarota/api' : '')).replace(/\/+$/, '');

if (!API_BASE) {
  throw new Error('Set EXPO_PUBLIC_API_BASE to the production API URL.');
}
if (!__DEV__ && !/^https:\/\//i.test(API_BASE)) {
  throw new Error('Production API requests must use HTTPS.');
}

export const MEDIA_BASE = API_BASE.replace('/api', '');

let _token = null;
let onUnauthorizedCallback = null;

export function setUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}

export function setAuthToken(token) {
  _token = token;
}

export function getAuthToken() {
  return _token;
}

export function getAuthHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

export function getAuthenticatedMediaSource(endpoint) {
  return {
    uri: `${API_BASE}/${endpoint.replace(/^\/+/, '')}`,
    headers: getAuthHeaders(),
  };
}

export async function apiRequest(endpoint, options = {}) {
  const route = endpoint.split('?')[0].replace(/^\/+/, '');
  const isAuthRoute = new Set([
    'login.php',
    'appeal_login.php',
    'register.php',
    'forgot_password.php',
    'reset_password.php',
    'login_2fa.php',
  ]).has(route);

  if (!_token && !isAuthRoute) {
    return { success: false, error: 'No active session.' };
  }

  const url = `${API_BASE}/${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  if (options.json) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.json);
    delete options.json;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Catch 401 Unauthorized
    if (response.status === 401 && !isAuthRoute) {
      // Only trigger logout if we actually have a token in memory
      if (onUnauthorizedCallback && _token) {
        onUnauthorizedCallback();
      }
      return { success: false, error: 'Session expired. Please log in again.' };
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Invalid server response.' };
    }
    
    if (!response.ok && data.error) {
      return { success: false, error: data.error };
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return { success: false, error: 'Network error. Check your connection.' };
  }
}