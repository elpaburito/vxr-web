import React, { createContext, useState, useContext } from 'react';

const ListingsContext = createContext();

export function ListingsProvider({ children }) {
  const [listings, setListings] = useState([]);

  const addListing = (listing) => {
    const newListing = {
      id: Date.now(), // Simple unique ID
      ...listing,
      createdAt: new Date().toISOString()
    };
    setListings(prev => [newListing, ...prev]);
  };

  const deleteListing = (id) => {
    setListings(prev => prev.filter(listing => listing.id !== id));
  };

  const updateListing = (id, updatedData) => {
    setListings(prev => prev.map(listing => 
      listing.id === id ? { ...listing, ...updatedData } : listing
    ));
  };

  return (
    <ListingsContext.Provider value={{ listings, addListing, deleteListing, updateListing }}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (!context) {
    throw new Error('useListings must be used within a ListingsProvider');
  }
  return context;
}