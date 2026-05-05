import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchBookmarkedIds, addBookmark, removeBookmark } from '../lib/bookmarksService';
import { fetchListingsByIds } from '../lib/listingsService';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  // bookmarkedIds: Set of listing id strings
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  // wishlist: array of full normalized listing objects (for /wishlists page)
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBookmarks = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      const { data: ids } = await fetchBookmarkedIds(user.id);
      const idSet = new Set((ids ?? []).map(String));
      setBookmarkedIds(idSet);
      if (ids && ids.length > 0) {
        const { data: listings } = await fetchListingsByIds(ids);
        setWishlist(listings ?? []);
      } else {
        setWishlist([]);
      }
      setLoading(false);
    } else {
      try {
        const saved = localStorage.getItem('wishlist');
        const parsed = saved ? JSON.parse(saved) : [];
        setBookmarkedIds(new Set(parsed.map((p) => String(p.id))));
        setWishlist(parsed);
      } catch {
        setBookmarkedIds(new Set());
        setWishlist([]);
      }
    }
  }, [user?.id]);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  const persistLocal = (arr) => {
    try { localStorage.setItem('wishlist', JSON.stringify(arr)); } catch { /* ignore */ }
  };

  const addToWishlist = async (property) => {
    if (!property?.id) return;
    const id = String(property.id);
    if (bookmarkedIds.has(id)) return;

    setBookmarkedIds((prev) => new Set([...prev, id]));
    setWishlist((prev) => {
      if (prev.some((p) => String(p.id) === id)) return prev;
      const next = [...prev, property];
      if (!user?.id) persistLocal(next);
      return next;
    });

    if (user?.id) {
      const { error } = await addBookmark(user.id, property.id);
      if (error) {
        // rollback on failure
        setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setWishlist((prev) => prev.filter((p) => String(p.id) !== id));
      }
    }
  };

  const removeFromWishlist = async (propertyId) => {
    const id = String(propertyId);
    const prevIds = bookmarkedIds;
    const prevWishlist = wishlist;

    setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setWishlist((prev) => {
      const next = prev.filter((p) => String(p.id) !== id);
      if (!user?.id) persistLocal(next);
      return next;
    });

    if (user?.id) {
      const { error } = await removeBookmark(user.id, propertyId);
      if (error) {
        // rollback on failure
        setBookmarkedIds(prevIds);
        setWishlist(prevWishlist);
      }
    }
  };

  const isInWishlist = (propertyId) => bookmarkedIds.has(String(propertyId));

  const toggleWishlist = (property) => {
    if (isInWishlist(property.id)) {
      removeFromWishlist(property.id);
    } else {
      addToWishlist(property);
    }
  };

  const clearWishlist = async () => {
    if (wishlist.length === 0) return;
    const ids = wishlist.map((p) => p.id);
    setBookmarkedIds(new Set());
    setWishlist([]);
    if (user?.id) {
      await Promise.all(ids.map((id) => removeBookmark(user.id, id)));
    } else {
      persistLocal([]);
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      bookmarkedIds,
      loading,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      clearWishlist,
      refresh: loadBookmarks,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
