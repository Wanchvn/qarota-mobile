import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiRequest } from './api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchCounts = async () => {
    try {
      const res = await apiRequest('get_counts.php');
      if (res.success) {
        setUnreadMessages(res.unread_messages || 0);
        setUnreadNotifications(res.unread_notifications || 0);
      }
    } catch (e) {
      // Silently fail if offline
    }
  };

  useEffect(() => {
    fetchCounts();
    // Poll every 15 seconds for new messages/notifications
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      unreadMessages, setUnreadMessages,
      unreadNotifications, setUnreadNotifications,
      fetchCounts // Export this so ChatScreen can call it
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}