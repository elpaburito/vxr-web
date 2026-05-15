import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead as svcMarkAsRead,
  markAllAsRead as svcMarkAllAsRead,
  subscribeToNotifications,
} from "../lib/notificationService";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    const [{ data: rows }, { count }] = await Promise.all([
      fetchNotifications(user.id),
      fetchUnreadCount(user.id),
    ]);
    setNotifications(rows);
    setUnreadCount(count);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = subscribeToNotifications(user.id, (row) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === row.id)) return prev;
        return [row, ...prev];
      });
      if (!row.is_read) setUnreadCount((c) => c + 1);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const markAsRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const wasUnread = !target.is_read;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    const { error } = await svcMarkAsRead(id);
    if (error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: target.is_read } : n))
      );
      if (wasUnread) setUnreadCount((c) => c + 1);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    const prev = notifications;
    const prevCount = unreadCount;
    setNotifications((curr) => curr.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    const { error } = await svcMarkAllAsRead(user.id);
    if (error) {
      setNotifications(prev);
      setUnreadCount(prevCount);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: load,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
