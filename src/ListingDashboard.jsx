import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MapPin, Search, Home, DollarSign, Calendar, Camera, Upload, Image, 
  Users, Bath, Bed, PawPrint, Cigarette, Clock, User, ArrowLeft, X, Bell
} from 'lucide-react';
import { useListings } from './context/ListingsContext.jsx';
import ProfileDropdown from './components/ProfileDropdown.jsx';

const ViewRentListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { listings, addListing, updateListing } = useListings();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Get edit mode and listing id from URL
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const isEditMode = !!editId;
  
  // Find listing to edit
  const listingToEdit = isEditMode ? listings.find(l => l.id === parseInt(editId)) : null;

  // Form state - ADDED 'area' field
  const [formData, setFormData] = useState({
    title: '',
    status: 'active',
    city: '',
    province: '',
    fullAddress: '',
    streetArea: '',
    postalCode: '',
    propertyType: '',
    furnishing: '',
    bedrooms: '',
    bathrooms: '',
    area: '',              // ← NEW: Area field
    maxOccupants: '',
    monthlyRent: '',
    securityDeposit: '',
    advancePayment: '',
    paymentTerms: '',
    availability: 'immediate',
    availableFrom: '',
    leaseTerm: '12',
    aboutPlace: '',
    unitDetails: '',
    amenities: [],
    pets: 'no',
    smoking: 'no',
    guestPolicy: 'Day/Nite Only',
    curfew: 'no',
    hostName: '',
    role: '',
    responseTime: 'Within 1 Hour',
    images: []
  });

  const [uploadedImages, setUploadedImages] = useState([]);

  const handleLogout = () => {
    setDropdownOpen(false);
    navigate("/");
  };

  // Load listing data when in edit mode - ADDED 'area' field
  useEffect(() => {
    if (listingToEdit) {
      setFormData({
        title: listingToEdit.title || '',
        status: listingToEdit.status || 'active',
        city: listingToEdit.city || '',
        province: listingToEdit.province || '',
        fullAddress: listingToEdit.fullAddress || '',
        streetArea: listingToEdit.streetArea || '',
        postalCode: listingToEdit.postalCode || '',
        propertyType: listingToEdit.propertyType || '',
        furnishing: listingToEdit.furnishing || '',
        bedrooms: listingToEdit.bedrooms || '',
        bathrooms: listingToEdit.bathrooms || '',
        area: listingToEdit.area || '',              // ← NEW: Area field
        maxOccupants: listingToEdit.maxOccupants || '',
        monthlyRent: listingToEdit.monthlyRent || '',
        securityDeposit: listingToEdit.securityDeposit || '',
        advancePayment: listingToEdit.advancePayment || '',
        paymentTerms: listingToEdit.paymentTerms || '',
        availability: listingToEdit.availability || 'immediate',
        availableFrom: listingToEdit.availableFrom || '',
        leaseTerm: listingToEdit.leaseTerm || '12',
        aboutPlace: listingToEdit.aboutPlace || '',
        unitDetails: listingToEdit.unitDetails || '',
        amenities: listingToEdit.amenities || [],
        pets: listingToEdit.pets || 'no',
        smoking: listingToEdit.smoking || 'no',
        guestPolicy: listingToEdit.guestPolicy || 'Day/Nite Only',
        curfew: listingToEdit.curfew || 'no',
        hostName: listingToEdit.hostName || '',
        role: listingToEdit.role || '',
        responseTime: listingToEdit.responseTime || 'Within 1 Hour',
        images: listingToEdit.images || []
      });
      setUploadedImages(listingToEdit.images || []);
    }
  }, [listingToEdit]);

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setUploadedImages(prev => [...prev, ...imageUrls]);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const amenities = formData.amenities;
      if (checked) {
        setFormData(prev => ({ ...prev, amenities: [...prev.amenities, name] }));
      } else {
        setFormData(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== name) }));
      }
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create listing object
    const listingData = {
      title: formData.title || 'New Listing',
      address: formData.fullAddress || `${formData.city || 'City'}, ${formData.province || 'Province'}`,
      price: formData.monthlyRent ? `₱${formData.monthlyRent}/mo` : '₱0/mo',
      images: uploadedImages,
      status: formData.status,
      ...formData
    };

    if (isEditMode && editId) {
      // Update existing listing
      updateListing(parseInt(editId), listingData);
    } else {
      // Add new listing
      addListing(listingData);
    }
    
    // Navigate back to my listings
    navigate('/my-listings');
  };

  return (
    <div className="w-[100%] min-h-[100vh] bg-gray-50">
      {/* Header - Profile Page style with dropdown */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
        onClick={() => setDropdownOpen(false)}
      >
        <div
          style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left side with Back Button and Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 4
              }}
            >
              <ArrowLeft size={22} color="white" />
            </button>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
              </div>
              <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
            </div>
          </div>

          {/* Right side icons - Profile Page style with dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>

            {/* Home icon */}
            <button onClick={() => navigate("/home2")} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4
            }}>
              <Home size={22} color="white" />
            </button>

            {/* Notification Bell */}
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

            {/* White pill: avatar + chevron - Profile Page style */}
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
              {/* Salmon circle avatar */}
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
              {/* Dark filled triangle chevron */}
              <div style={{
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid #222",
                flexShrink: 0
              }} />
            </button>

            {dropdownOpen && <ProfileDropdown onLogout={handleLogout} />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-[100%] max-w-[64rem] mx-auto px-[1rem] py-[2rem]">
        <form onSubmit={handleSubmit}>
          {/* Manage Listings Title */}
          <h2 className="text-[2rem] font-semibold mb-6" style={{ color: '#e8756a' }}>
            {isEditMode ? 'Edit Listing' : 'Create New Listing'}
          </h2>

          {/* Form Sections */}
          <div className="space-y-6">
            
            {/* Listing Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Listing Title</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Listing Status</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="status" 
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Active
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="status" 
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Inactive
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Listing Title</label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter listing title" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Location Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input 
                    type="text" 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Province / Region</label>
                  <input 
                    type="text" 
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    placeholder="Enter province or region" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                  <input 
                    type="text" 
                    name="fullAddress"
                    value={formData.fullAddress}
                    onChange={handleChange}
                    placeholder="Enter full Address" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Area</label>
                  <input 
                    type="text" 
                    name="streetArea"
                    value={formData.streetArea}
                    onChange={handleChange}
                    placeholder="Enter street area" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                  <input 
                    type="text" 
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Enter postal code" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search for your property address</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Start typing your address in the Philippines" 
                      className="w-full p-3 pl-10 border border-gray-300 rounded-lg" 
                    />
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Map:</h4>
                <div className="bg-gray-100 h-48 rounded-lg mb-4 flex items-center justify-center border border-gray-300">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-gray-500">Map Preview</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details - UPDATED with Area field */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Property Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type:</label>
                  <select 
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select property type</option>
                    <option value="Apartment">Apartment</option>
                    <option value="House">House</option>
                    <option value="Condo">Condo</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Furnishing:</label>
                  <select 
                    name="furnishing"
                    value={formData.furnishing}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select furnishing</option>
                    <option value="Furnished">Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Semi-furnished">Semi-furnished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms:</label>
                  <select 
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Number of bedrooms</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5+">5+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms:</label>
                  <select 
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Number of bathrooms</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>

                {/* NEW: Area Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor Area (m²):</label>
                  <input 
                    type="number" 
                    name="area"
                    value={formData.area || ''}
                    onChange={handleChange}
                    placeholder="e.g., 45" 
                    min="0"
                    step="1"
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Occupants:</label>
                  <input 
                    type="number" 
                    name="maxOccupants"
                    value={formData.maxOccupants}
                    onChange={handleChange}
                    min="0" 
                    placeholder="e.g., 4"
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>
              </div>
            </div>

            {/* Rental Pricing */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Rental Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent:</label>
                  <input 
                    type="text" 
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder="₱0.00" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit:</label>
                  <input 
                    type="text" 
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    placeholder="₱0.00" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Advance Payment:</label>
                  <input 
                    type="text" 
                    name="advancePayment"
                    value={formData.advancePayment}
                    onChange={handleChange}
                    placeholder="₱0.00" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms:</label>
                  <select 
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select payment terms</option>
                    <option value="1 Month Advance + 1 Month Upfront">1 Month Advance + 1 Month Upfront</option>
                    <option value="1 Month Advance + 1 Month Deposit">1 Month Advance + 1 Month Deposit</option>
                    <option value="2 Months Advance + 1 Month Deposit">2 Months Advance + 1 Month Deposit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Availability & Lease */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Availability & Lease</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability Status:</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="availability" 
                        value="immediate"
                        checked={formData.availability === 'immediate'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Immediate
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="availability" 
                        value="future"
                        checked={formData.availability === 'future'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Future Date
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available From:</label>
                  <input 
                    type="date" 
                    name="availableFrom"
                    value={formData.availableFrom}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease Term (Months):</label>
                  <select 
                    name="leaseTerm"
                    value={formData.leaseTerm}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Unit Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Unit Description</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">About The Place:</label>
                  <textarea 
                    name="aboutPlace"
                    value={formData.aboutPlace}
                    onChange={handleChange}
                    rows="3" 
                    placeholder="Describe the apartment, its features, etc." 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Details:</label>
                  <textarea 
                    name="unitDetails"
                    value={formData.unitDetails}
                    onChange={handleChange}
                    rows="3" 
                    placeholder="Additional room/area: The unit" 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Amenities & Features */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Amenities & Features</h3>
              <p className="text-sm text-gray-600 mb-3">Select all amenities that are available</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  'No Smoking', 'Parking', 'Seating Spot', 'Air Conditioning',
                  'Kitchen', 'CCTV', 'WiFi/Link', 'Swimming Pool',
                  'Balcony', 'Water Tank'
                ].map(amenity => (
                  <label key={amenity} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name={amenity.toLowerCase().replace(/[^a-z0-9]/g, '')}
                      checked={formData.amenities.includes(amenity.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      onChange={handleChange}
                      className="w-4 h-4" 
                      style={{ accentColor: '#e8756a' }} 
                    /> {amenity}
                  </label>
                ))}
              </div>
            </div>

            {/* Rental Rules & Policies */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Rental Rules & Policies</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pets allowed:</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="pets" 
                        value="yes"
                        checked={formData.pets === 'yes'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="pets" 
                        value="no"
                        checked={formData.pets === 'no'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Allowed:</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="smoking" 
                        value="yes"
                        checked={formData.smoking === 'yes'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="smoking" 
                        value="no"
                        checked={formData.smoking === 'no'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guest Policy:</label>
                  <select 
                    name="guestPolicy"
                    value={formData.guestPolicy}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Day/Nite Only">Day/Nite Only</option>
                    <option value="Weekend">Weekend</option>
                    <option value="Not Allowed">Not Allowed</option>
                    <option value="Full Allowance">Full Allowance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Curfew:</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="curfew" 
                        value="no"
                        checked={formData.curfew === 'no'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> No Curfew
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="curfew" 
                        value="yes"
                        checked={formData.curfew === 'yes'}
                        onChange={handleChange}
                        className="w-4 h-4" 
                        style={{ accentColor: '#e8756a' }} 
                      /> With Curfew
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Host Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Host Name:</label>
                  <input 
                    type="text" 
                    name="hostName"
                    value={formData.hostName}
                    onChange={handleChange}
                    placeholder="Enter Host Name" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role:</label>
                  <select 
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select role</option>
                    <option value="Project Co-Worker">Project Co-Worker</option>
                    <option value="Property Owner">Property Owner</option>
                    <option value="Property Manager">Property Manager</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Response Time:</label>
                  <select 
                    name="responseTime"
                    value={formData.responseTime}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Within 1 Hour">Within 1 Hour</option>
                    <option value="Within 2 Hours">Within 2 Hours</option>
                    <option value="Within 6 Hours">Within 6 Hours</option>
                    <option value="Within 24 Hours">Within 24 Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Media Upload</h3>
              <p className="text-sm text-gray-600 mb-4">Upload Images and media for your listing</p>
              
              {/* Image Preview */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img src={img} alt={`Upload ${index}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">Property Images</p>
                  <p className="text-xs text-gray-500">Click to upload</p>
                </label>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">360 Media</p>
                  <p className="text-xs text-gray-500">Click to upload</p>
                </div>

                <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        const url = URL.createObjectURL(e.target.files[0]);
                        setUploadedImages(prev => [url, ...prev.slice(0, 0)]);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">Cover Photo</p>
                  <p className="text-xs text-gray-500">Click to select</p>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/my-listings')}
                className="px-8 py-3 text-gray-600 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition"
                style={{ backgroundColor: '#e8756a' }}
              >
                {isEditMode ? 'Update Listing' : 'Create Listing'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViewRentListing;