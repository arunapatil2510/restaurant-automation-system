import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ShoppingBag, 
  CalendarCheck, 
  Tag, 
  ChefHat, 
  LogOut, 
  ExternalLink,
  Shield,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const { adminUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', label: 'Overview', icon: <LayoutDashboard size={18} />, end: true },
    { path: '/admin/menu', label: 'Menu Manager', icon: <UtensilsCrossed size={18} /> },
    { path: '/admin/orders', label: 'Live Orders', icon: <ShoppingBag size={18} /> },
    { path: '/admin/reservations', label: 'Reservations', icon: <CalendarCheck size={18} /> },
    { path: '/admin/offers', label: 'Offers & Promos', icon: <Tag size={18} /> },
    { path: '/admin/kitchen', label: 'Kitchen KDS', icon: <ChefHat size={18} /> },
  ];

  return (
    <div className="admin-layout">
      {/* 1. Admin Sidebar */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand-logo">
            <div className="admin-logo-badge">
              <Shield size={20} />
            </div>
            <div>
              <span className="admin-brand-name">RESTOSMART</span>
              <span className="admin-badge-role">Staff Portal</span>
            </div>
          </div>
          <button 
            className="admin-sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="admin-nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer: Customer view link */}
        <div className="admin-sidebar-footer">
          <Link to="/" className="btn-customer-portal" target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Open Customer View
          </Link>
        </div>
      </aside>

      {/* 2. Main Admin Workspace Area */}
      <div className="admin-main-wrapper">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-hamburger-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle admin sidebar"
            >
              <MenuIcon size={22} />
            </button>
            <h2 className="admin-current-screen-title">Restaurant Management</h2>
          </div>

          <div className="admin-topbar-right">
            {/* User Profile Pill */}
            <div className="admin-user-pill">
              <div className="admin-avatar-circle">
                {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name">{adminUser?.name || 'Admin User'}</span>
                <span className="admin-user-role">{adminUser?.role || 'Manager'}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button className="btn-admin-logout" onClick={handleLogout} title="Log out of staff portal">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Admin Page Content */}
        <main className="admin-content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
