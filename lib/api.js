// lib/api.js

// Reverted to local PC IP for development
export const API_BASE = 'http://192.168.1.91/qarota/api';

// Helper to get the base URL for images/videos
export const MEDIA_BASE = API_BASE.replace('/api', '');

let _token = null;

// --- NEW: Global 401 Handler ---
let onUnauthorizedCallback = null;

export function setUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}
// ------------------------------

export function setAuthToken(token) {
  _token = token;
}

export function getAuthToken() {
  return _token;
}

export async function apiRequest(endpoint, options = {}) {
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
    
    // --- NEW: Catch 401 Unauthorized ---
    if (response.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback(); // Force logout in App.js
      }
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    // ----------------------------------

    // Handle empty or non-JSON responses gracefully
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Invalid server response.' };
    }
    
    // Pass rate limit errors through cleanly
    if (!response.ok && data.error) {
      return { success: false, error: data.error };
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return { success: false, error: 'Network error. Check your connection.' };
  }
}