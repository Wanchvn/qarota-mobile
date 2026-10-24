import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiRequest, getAuthToken } from './api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [lowDataMode, setLowDataMode] = useState(null);

  const fetchCounts = async () => {
    // THE FIX: Don't even try to fetch if we are logged out
    if (!getAuthToken()) return;

    try {
      const res = await apiRequest('get_counts.php');
      if (res.success) {
        setUnreadMessages(res.unread_messages || 0);
        setUnreadNotifications(res.unread_notifications || 0);
      }
    } catch (e) {
      // Silently fail
    }
  };

  useEffect(() => {
    const initialFetch = setTimeout(fetchCounts, 0);
    const interval = setInterval(fetchCounts, 15000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!getAuthToken()) return;
    apiRequest('get_feed_preferences.php')
      .then((res) => {
        if (res.success && res.settings) setLowDataMode(Boolean(res.settings.low_data_mode));
      })
      .catch((error) => console.error('Could not load feed preferences:', error));
  }, []);

  return (
    <AppContext.Provider value={{
      unreadMessages, setUnreadMessages,
      unreadNotifications, setUnreadNotifications,
      fetchCounts,
      lowDataMode, setLowDataMode,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}