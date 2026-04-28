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
import Messaging from "./Messaging.jsx";
import EnlistmentApplications from "./EnlistmentApplications.jsx";
import ContractView from "./ContractView.jsx";
import ContractPayment from "./ContractPayment.jsx";
import { ListingsProvider } from "./context/ListingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

function AppRouter() {
  return (
    <Router>
      <AuthProvider>
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
              <Route path="/unit/:id" element={<UnitDetails />} />
              <Route path="/messages" element={<Messaging />} />
              <Route path="/enlistment" element={<EnlistmentApplications />} />
              <Route path="/contract/:id" element={<ContractView />} />
              <Route path="/contract/:id/pay" element={<ContractPayment />} />
            </Routes>
          </WishlistProvider>
        </ListingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default AppRouter;