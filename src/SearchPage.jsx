import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Search, Heart, Star, MapPin, Home, Filter, ChevronDown, ChevronUp,
  Bed, Bath, Square, Maximize2, Minimize2, X, Bell, User,
  Bookmark, Settings, Mail, FileText, ClipboardList, LogOut,
  MessageCircle, BarChart2, SlidersHorizontal
} from "lucide-react";
import { TRECE, BARANGAY, PASIG, DASMA } from "./data/listings.js";
import PropertyCard from "./components/PropertyCard.jsx";
import ProfileDropdown from "./components/ProfileDropdown.jsx";

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [liked, setLiked] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    sortBy: "Any",
    propertyType: "Any",
    city: "Any",
    bedrooms: "Any",
    bathrooms: "Any",
    areaMin: "0",
    areaMax: "200",
    furnishing: "Any",
    petPolicy: "Any"
  });

  // Bedrooms dropdown
  const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
  const [showBathroomsDropdown, setShowBathroomsDropdown] = useState(false);

  const allListings = [...TRECE, ...BARANGAY, ...PASIG, ...DASMA];

  // Receive search query from homepage
  useEffect(() => {
    if (location.state?.searchQuery) {
      setWhere(location.state.searchQuery);
      setSearchTriggered(true);
    }
    if (location.state?.dateQuery) {
      setWhen(location.state.dateQuery);
    }
  }, [location.state]);

  // Filter and search listings
  const getFilteredListings = () => {
    let filtered = [...allListings];

    // Search by title/location (where field)
    if (where.trim() !== "") {
      const searchTerm = where.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchTerm) ||
        listing.location.toLowerCase().includes(searchTerm) ||
        listing.type.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by property type
    if (filters.propertyType !== "Any") {
      filtered = filtered.filter(listing => 
        listing.type.toLowerCase().includes(filters.propertyType.toLowerCase())
      );
    }

    // Filter by city
    if (filters.city !== "Any") {
      filtered = filtered.filter(listing => 
        listing.location.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Filter by bedrooms
    if (filters.bedrooms !== "Any") {
      if (filters.bedrooms === "5+") {
        filtered = filtered.filter(listing => listing.bedrooms >= 5);
      } else {
        filtered = filtered.filter(listing => listing.bedrooms === parseInt(filters.bedrooms));
      }
    }

    // Filter by bathrooms
    if (filters.bathrooms !== "Any") {
      if (filters.bathrooms === "4+") {
        filtered = filtered.filter(listing => listing.bathrooms >= 4);
      } else {
        filtered = filtered.filter(listing => listing.bathrooms === parseInt(filters.bathrooms));
      }
    }

    // Filter by area
    const minArea = parseInt(filters.areaMin) || 0;
    const maxArea = parseInt(filters.areaMax) || 200;
    filtered = filtered.filter(listing => 
      listing.area >= minArea && listing.area <= maxArea
    );

    // Sort results
    if (filters.sortBy !== "Any") {
      switch(filters.sortBy) {
        case "Price: Low to High":
          filtered.sort((a, b) => {
            const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
            const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
            return priceA - priceB;
          });
          break;
        case "Price: High to Low":
          filtered.sort((a, b) => {
            const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
            const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
            return priceB - priceA;
          });
          break;
        case "Rating: High to Low":
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case "Newest First":
          filtered.sort((a, b) => b.id - a.id);
          break;
        default:
          break;
      }
    }

    return filtered;
  };

  const filteredListings = getFilteredListings();

  const toggleLike = (id) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      sortBy: "Any",
      propertyType: "Any",
      city: "Any",
      bedrooms: "Any",
      bathrooms: "Any",
      areaMin: "0",
      areaMax: "200",
      furnishing: "Any",
      petPolicy: "Any"
    });
  };

  const applyFilters = () => {
    console.log("Filters applied:", filters);
    setShowFilters(false);
  };

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Bedrooms options
  const bedroomsOptions = ["Any", "1", "2", "3", "4", "5+"];
  const bathroomsOptions = ["Any", "1", "2", "3", "4+"];

  // Google Maps Embed URL for Dasmariñas
  const mapSrc = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123792.93519097227!2d120.93433955!3d14.329567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d3a3b5b3b3b3%3A0x3b3b3b3b3b3b3b3b!2sDasmari%C3%B1as%2C%20Cavite!5e0!3m2!1sen!2sph!4v1234567890";

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50 flex flex-col relative">
      {/* Header */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
        onClick={() => setDropdownOpen(false)}
      >
        <div
          style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
          onClick={e => e.stopPropagation()}
        >
          <div 
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
            </div>
            <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <button onClick={() => navigate("/home2")} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4
            }}>
              <Home size={22} color="white" />
            </button>

            <button style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 4, position: "relative"
            }}>
              <Bell size={22} color="white" />
              <span style={{
                position: "absolute", top: 2, right: 2,
                width: 8, height: 8, borderRadius: "50%",
                background: "#ff3b30", border: "1.5px solid #f0a090"
              }} />
            </button>

            {isLoggedIn ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "white", border: "none", cursor: "pointer",
                  borderRadius: 999, padding: "5px 14px 5px 6px",
                  gap: 24, minWidth: 100,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: "2.5px solid #e8756a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden", flexShrink: 0
                }}>
                  <div style={{
                    position: "absolute", top: 6, left: "50%",
                    transform: "translateX(-50%)",
                    width: 11, height: 11, borderRadius: "50%", background: "#e8756a"
                  }} />
                  <div style={{
                    position: "absolute", bottom: -2, left: "50%",
                    transform: "translateX(-50%)",
                    width: 20, height: 13, borderRadius: "50% 50% 0 0", background: "#e8756a"
                  }} />
                </div>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "8px solid #222",
                  flexShrink: 0
                }} />
              </button>
            ) : (
              <button 
                onClick={() => navigate("/login")}
                className="text-white text-[0.875rem] font-medium hover:opacity-80 transition"
              >
                Sign In
              </button>
            )}

            {dropdownOpen && <ProfileDropdown onLogout={handleLogout} />}
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-[100%] max-w-[42rem] mx-auto px-[1rem] pb-[1.5rem]">
          <div className="bg-white rounded-2xl shadow-lg p-[0.5rem] flex flex-row gap-0">
            <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem] border-r border-gray-200">
              <span className="text-xs font-semibold text-gray-700">Where</span>
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by title, location, or type..."
                className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
              />
            </div>
            <div className="flex flex-col flex-1 px-[1rem] py-[0.5rem]">
              <span className="text-xs font-semibold text-gray-700">When</span>
              <input
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add dates"
                className="bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none w-[100%] mt-[0.125rem]"
              />
            </div>
            <div className="flex items-center pr-[0.5rem]">
              <button
                onClick={handleSearch}
                style={{ background: "#EC6138" }}
                className="flex items-center justify-center w-[2.25rem] h-[2.25rem] rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
              >
                <Search size={15} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-[100%] flex-1 flex">
        {/* Left Column - Listings */}
        <div className={`${showMap ? 'w-[40%]' : 'w-[100%]'} h-[100%] overflow-y-auto transition-all duration-300`}>
          <div className="w-[100%] max-w-[48rem] mx-auto px-[1.5rem] py-[1.5rem]">
            
            {/* Results Header */}
            <div className="flex items-center justify-between mb-[1.5rem] flex-wrap gap-[1rem]">
              <div>
                <h1 className="text-[1.5rem] font-bold text-gray-800">
                  {filteredListings.length} {filteredListings.length === 1 ? 'apartment' : 'apartments'} found
                </h1>
                {where && (
                  <p className="text-sm text-gray-500 mt-1">
                    Searching for: "{where}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-[0.5rem]">
                <button 
                  onClick={() => setShowMap(!showMap)}
                  className="flex items-center gap-[0.25rem] px-[0.75rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg text-[0.875rem] text-gray-700 hover:shadow-md transition"
                >
                  {showMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
                </button>
                <button 
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-[0.25rem] px-[0.75rem] py-[0.5rem] bg-white border border-gray-200 rounded-lg text-[0.875rem] text-gray-700 hover:shadow-md transition"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.propertyType !== "Any" || filters.city !== "Any" || filters.bedrooms !== "Any" || filters.bathrooms !== "Any" || filters.areaMin !== "0" || filters.areaMax !== "200" || filters.sortBy !== "Any") && (
              <div className="mb-[1.5rem] flex flex-wrap gap-[0.5rem]">
                <span className="text-xs text-gray-500 mr-2">Active filters:</span>
                {filters.sortBy !== "Any" && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">Sort: {filters.sortBy}</span>
                )}
                {filters.propertyType !== "Any" && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{filters.propertyType}</span>
                )}
                {filters.city !== "Any" && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{filters.city}</span>
                )}
                {filters.bedrooms !== "Any" && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{filters.bedrooms} {filters.bedrooms === "1" ? "Bed" : "Beds"}</span>
                )}
                {filters.bathrooms !== "Any" && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{filters.bathrooms} {filters.bathrooms === "1" ? "Bath" : "Baths"}</span>
                )}
                {(filters.areaMin !== "0" || filters.areaMax !== "200") && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{filters.areaMin}-{filters.areaMax} m²</span>
                )}
              </div>
            )}

            {/* No Results Message */}
            {filteredListings.length === 0 && (
              <div className="text-center py-[3rem]">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No properties found</h3>
                <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                <button
                  onClick={() => {
                    setWhere("");
                    resetFilters();
                  }}
                  className="mt-4 px-4 py-2 bg-[#EC6138] text-white rounded-lg hover:opacity-90 transition"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Listings Grid - 2 columns */}
            <div className="w-[100%] grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
              {filteredListings.slice(0, showMap ? 6 : 12).map((listing) => (
                <div key={listing.id} className="relative">
                  <PropertyCard property={listing} />
                </div>
              ))}
            </div>

            {/* Location Chips - Only show when no search/filters */}
            {!where && filteredListings.length === allListings.length && (
              <div className="mt-[2.5rem]">
                <h3 className="text-[1rem] font-semibold text-gray-700 mb-[1rem]">Popular Locations in Dasmariñas</h3>
                <div className="flex flex-wrap gap-[0.5rem]">
                  {[
                    "Salitran I", "Salitran II", "Salitran III", "Salitran IV", "Salitran V",
                    "San Agustin I", "San Agustin II", "San Agustin III", "Burol I", "Burol II",
                    "Paliparan I", "Paliparan II", "Paliparan III", "Langkaan I", "Langkaan II",
                    "Sampaloc I", "Sampaloc II", "Sampaloc III", "Fatima I", "Fatima II",
                    "San Francisco", "San Juan", "San Luis", "San Antonio", "San Mateo"
                  ].map((loc, index) => (
                    <button
                      key={index}
                      onClick={() => setWhere(loc)}
                      className="px-[0.75rem] py-[0.375rem] bg-white border border-gray-200 rounded-full text-[0.75rem] text-gray-600 hover:border-[#EC6138] hover:text-[#EC6138] transition"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Map */}
        {showMap && (
          <div className="w-[60%] h-[calc(100vh-180px)] sticky top-[180px]">
            <div className="w-[100%] h-[100%] bg-gray-200 relative">
              <iframe
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dasmariñas Map"
              ></iframe>
              <button className="absolute top-[1rem] right-[1rem] bg-white p-[0.5rem] rounded-full shadow-md hover:shadow-lg transition z-10">
                <Maximize2 size={18} className="text-gray-600" />
              </button>
              <button 
                onClick={() => setShowMap(false)}
                className="absolute top-[1rem] left-[1rem] bg-white p-[0.5rem] rounded-full shadow-md hover:shadow-lg transition z-10"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFilters(false)}
          ></div>
          
          {/* Filter Panel */}
          <div className="fixed top-0 right-0 w-[100%] max-w-[28rem] h-[100%] bg-white z-50 shadow-2xl overflow-y-auto">
            <div className="p-[1.5rem]">
              {/* Header */}
              <div className="flex items-center justify-between mb-[1.5rem] pb-[1rem] border-b border-gray-200">
                <div className="flex items-center gap-[0.5rem]">
                  <SlidersHorizontal size={20} className="text-gray-700" />
                  <h2 className="text-[1.25rem] font-semibold text-gray-800">Filters</h2>
                </div>
                <div className="flex items-center gap-[1rem]">
                  <button 
                    onClick={resetFilters}
                    className="text-[0.875rem] text-gray-500 hover:text-[#EC6138] transition"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="p-[0.5rem] hover:bg-gray-100 rounded-full transition"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Filter Content */}
              <div className="space-y-[1.5rem]">
                
                {/* Sort By */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Sort By</label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                  >
                    <option>Any</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Rating: High to Low</option>
                    <option>Newest First</option>
                  </select>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Property Type</label>
                  <select 
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                  >
                    <option>Any</option>
                    <option>Apartment</option>
                    <option>House</option>
                    <option>Condo</option>
                    <option>Studio</option>
                    <option>Townhouse</option>
                  </select>
                </div>

                {/* City/Municipal */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">City/Municipal</label>
                  <select 
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                  >
                    <option>Any</option>
                    <option>Dasmariñas</option>
                    <option>Trece Martires</option>
                    <option>Pasig City</option>
                    <option>Manila</option>
                    <option>Makati</option>
                  </select>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Bedrooms</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowBedroomsDropdown(!showBedroomsDropdown)}
                      className="w-full p-[0.75rem] border border-gray-200 rounded-lg flex items-center justify-between bg-white hover:bg-gray-50"
                    >
                      <span className="text-gray-700">{filters.bedrooms}</span>
                      {showBedroomsDropdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {showBedroomsDropdown && (
                      <div className="absolute top-full left-0 w-full mt-[0.25rem] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {bedroomsOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              handleFilterChange('bedrooms', option);
                              setShowBedroomsDropdown(false);
                            }}
                            className={`w-full text-left px-[1rem] py-[0.5rem] hover:bg-gray-100 transition ${filters.bedrooms === option ? 'bg-orange-50 text-[#EC6138]' : 'text-gray-700'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Bathrooms</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowBathroomsDropdown(!showBathroomsDropdown)}
                      className="w-full p-[0.75rem] border border-gray-200 rounded-lg flex items-center justify-between bg-white hover:bg-gray-50"
                    >
                      <span className="text-gray-700">{filters.bathrooms}</span>
                      {showBathroomsDropdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {showBathroomsDropdown && (
                      <div className="absolute top-full left-0 w-full mt-[0.25rem] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {bathroomsOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              handleFilterChange('bathrooms', option);
                              setShowBathroomsDropdown(false);
                            }}
                            className={`w-full text-left px-[1rem] py-[0.5rem] hover:bg-gray-100 transition ${filters.bathrooms === option ? 'bg-orange-50 text-[#EC6138]' : 'text-gray-700'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Area Range */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Area (m²)</label>
                  <div className="flex items-center gap-[1rem]">
                    <div className="flex-1">
                      <span className="text-[0.75rem] text-gray-500 block mb-[0.25rem]">Min</span>
                      <input
                        type="number"
                        value={filters.areaMin}
                        onChange={(e) => handleFilterChange('areaMin', e.target.value)}
                        className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                        min="0"
                      />
                    </div>
                    <span className="text-gray-400">to</span>
                    <div className="flex-1">
                      <span className="text-[0.75rem] text-gray-500 block mb-[0.25rem]">Max</span>
                      <input
                        type="number"
                        value={filters.areaMax}
                        onChange={(e) => handleFilterChange('areaMax', e.target.value)}
                        className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Furnishing */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Furnishing</label>
                  <select 
                    value={filters.furnishing}
                    onChange={(e) => handleFilterChange('furnishing', e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                  >
                    <option>Any</option>
                    <option>Fully Furnished</option>
                    <option>Semi-Furnished</option>
                    <option>Unfurnished</option>
                  </select>
                </div>

                {/* Pet Policy */}
                <div>
                  <label className="block text-[0.875rem] font-medium text-gray-700 mb-[0.5rem]">Pet Policy</label>
                  <select 
                    value={filters.petPolicy}
                    onChange={(e) => handleFilterChange('petPolicy', e.target.value)}
                    className="w-full p-[0.75rem] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6138]"
                  >
                    <option>Any</option>
                    <option>Pets Allowed</option>
                    <option>No Pets</option>
                    <option>Small Pets Only</option>
                  </select>
                </div>
              </div>

              {/* Apply Button */}
              <div className="mt-[2rem] pt-[1rem] border-t border-gray-200">
                <button
                  onClick={applyFilters}
                  className="w-full py-[0.875rem] text-white font-semibold rounded-lg transition hover:opacity-90"
                  style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}