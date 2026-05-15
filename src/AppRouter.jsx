import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage2 from "./HomePage2.jsx";
import LoginPage from "./Loginpage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import MyListings from "./MyListings.jsx";
import Wishlist from "./Wishlist.jsx";
import SearchPage from "./SearchPage.jsx";
import UnitDetails from "./UnitDetails.jsx"; // Changed from ListingDetails to UnitDetails
import Messaging from "./Messaging.jsx";
import EnlistmentApplications from "./EnlistmentApplications.jsx";
import ContractView from "./ContractView.jsx";
import ContractPayment from "./ContractPayment.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminCMS from "./AdminCMS.jsx";
import RentalApplicationForm from "./RentalApplicationForm.jsx";
import InStayDashboard from "./InStayDashboard.jsx";
import TenantManagement from "./TenantManagement.jsx";
import ReportManagement from "./ReportManagement.jsx";
import HouseEnlistment from "./HouseEnlistment.jsx";
import MyPayments from "./MyPayments.jsx";
import MoveOutChecklist from "./MoveOutChecklist.jsx";
import RelistPrompt from "./RelistPrompt.jsx";
import { ListingsProvider } from "./context/ListingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";

function AppRouter() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ListingsProvider>
            <WishlistProvider>
              <Routes>
              <Route path="/" element={<App />} />
              <Route path="/home2" element={<HomePage2 />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/wishlists" element={<Wishlist />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/unit/:id" element={<UnitDetails />} />
              <Route path="/messages" element={<Messaging />} />
              <Route path="/enlistment" element={<EnlistmentApplications />} />
              <Route path="/contract/:id" element={<ContractView />} />
              <Route path="/contract/:id/pay" element={<ContractPayment />} />
              <Route path="/contract/:id/move-out" element={<MoveOutChecklist />} />
              <Route path="/listings/:id/relist" element={<RelistPrompt />} />
              <Route path="/apply/:id" element={<RentalApplicationForm />} />
              <Route path="/my-rental" element={<InStayDashboard />} />
              <Route path="/tenant-management" element={<TenantManagement />} />
              <Route path="/reports" element={<ReportManagement />} />
              <Route path="/enlist" element={<HouseEnlistment />} />
              <Route path="/my-payments" element={<MyPayments />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/cms" element={<AdminCMS />} />
              </Routes>
            </WishlistProvider>
          </ListingsProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default AppRouter;