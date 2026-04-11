import house from "../assets/house.jpg";

export const DASMA = [
  { 
    id: 1, 
    title: "Kalipunan Skyline Studio", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 3,000", 
    rating: 4.7, 
    reviews: 18, 
    img: house,
    location: "Brgy. San Agustin, Dasmariñas City",
    bedrooms: 1,
    bathrooms: 1,
    area: 25
  },
  { 
    id: 2, 
    title: "Sorial View Condotel", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 3,500", 
    rating: 4.8, 
    reviews: 11, 
    img: house,
    location: "Brgy. Salitran, Dasmariñas City",
    bedrooms: 2,
    bathrooms: 1,
    area: 32
  },
  { 
    id: 3, 
    title: "Mabuharian Business Flat", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 4,500", 
    rating: 4.5, 
    reviews: 9, 
    img: house,
    location: "Brgy. Paliparan, Dasmariñas City",
    bedrooms: 2,
    bathrooms: 2,
    area: 45
  },
  { 
    id: 4, 
    title: "Dalibago Central Lofts", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 2,750", 
    rating: 3.8, 
    reviews: 9, 
    img: house,
    location: "Brgy. San Jose, Dasmariñas City",
    bedrooms: 1,
    bathrooms: 1,
    area: 22
  },
  { 
    id: 5, 
    title: "Greenfield Residences", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 4,200", 
    rating: 4.6, 
    reviews: 24, 
    img: house,
    location: "Brgy. Langkaan, Dasmariñas City",
    bedrooms: 2,
    bathrooms: 2,
    area: 38
  },
  { 
    id: 6, 
    title: "Metro Heights Condo", 
    type: "Condo · Dasmariñas", 
    price: "₱ 5,000", 
    rating: 4.9, 
    reviews: 32, 
    img: house,
    location: "Brgy. Zone I, Dasmariñas City",
    bedrooms: 2,
    bathrooms: 2,
    area: 42
  },
  { 
    id: 7, 
    title: "Villa Olympia", 
    type: "House · Dasmariñas", 
    price: "₱ 8,500", 
    rating: 4.7, 
    reviews: 15, 
    img: house,
    location: "Brgy. Burol, Dasmariñas City",
    bedrooms: 3,
    bathrooms: 2,
    area: 85
  },
  { 
    id: 8, 
    title: "The Palm Residences", 
    type: "Apartment · Dasmariñas", 
    price: "₱ 3,800", 
    rating: 4.4, 
    reviews: 19, 
    img: house,
    location: "Brgy. Sampaloc, Dasmariñas City",
    bedrooms: 2,
    bathrooms: 1,
    area: 28
  }
];

// Re-export with same names for backward compatibility
export const TRECE = DASMA.slice(0, 4);
export const BARANGAY = DASMA.slice(4, 8);
export const PASIG = DASMA.slice(0, 4);