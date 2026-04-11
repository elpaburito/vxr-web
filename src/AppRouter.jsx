import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./HomePage.jsx";
import HomePage2 from "./HomePage2.jsx";
import LoginPage from "./Loginpage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import MyListings from "./MyListings.jsx";
import ViewRentListing from "./ListingDashboard.jsx";
import Wishlist from "./Wishlist.jsx";
import SearchPage from "./SearchPage.jsx";
import UnitDetails from "./UnitDetails.jsx"; // Changed from ListingDetails to UnitDetails
import { ListingsProvider } from "./context/ListingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";

function AppRouter() {
  return (
    <Router>
      <ListingsProvider>
        <WishlistProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/home2" element={<HomePage2 />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/dashboard" element={<ViewRentListing />} />
            <Route path="/wishlists" element={<Wishlist />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/unit/:id" element={<UnitDetails />} /> {/* Updated route */}
          </Routes>
        </WishlistProvider>
      </ListingsProvider>
    </Router>
  );
}

export default AppRouter;