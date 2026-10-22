import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiRequest, getAuthToken } from './api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      unreadMessages, setUnreadMessages,
      unreadNotifications, setUnreadNotifications,
      fetchCounts 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}