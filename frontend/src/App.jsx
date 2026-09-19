import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Customer Pages
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { OffersPage } from './pages/OffersPage';
import { QRAccessPage } from './pages/QRAccessPage';

// Admin Components & Pages
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminMenuPage } from './pages/admin/AdminMenuPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage';
import { AdminOffersPage } from './pages/admin/AdminOffersPage';
import { AdminKitchenPage } from './pages/admin/AdminKitchenPage';

// Customer Layout with Public Navbar & Footer
const CustomerLayout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* 1. Customer Public Experience (No Login Required) */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/qr-access" element={<QRAccessPage />} />
            </Route>

            {/* 2. Admin Login Page */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* 3. Protected Admin & Staff Operations Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="reservations" element={<AdminReservationsPage />} />
              <Route path="offers" element={<AdminOffersPage />} />
              <Route path="kitchen" element={<AdminKitchenPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
