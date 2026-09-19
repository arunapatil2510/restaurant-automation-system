import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, ShoppingBag, QrCode, Sparkles, Menu as MenuIcon, X, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const Navbar = () => {
  const location = useLocation();
  const { totalItems, tableNumber, setTableNumber } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/menu', label: 'Menu' },
    { path: '/offers', label: 'Offers', badge: '🔥' },
    { path: '/qr-access', label: 'Table QR', icon: <QrCode size={15} /> },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="navbar-wrapper">
      <div className="container navbar">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="nav-logo-icon">
            <Utensils size={20} />
          </div>
          <div className="nav-logo-text">
            <span className="nav-brand-title">RESTOSMART</span>
            <span className="nav-brand-subtitle">Smart Dining</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="nav-desktop-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
            >
              {link.icon && <span className="nav-link-icon">{link.icon}</span>}
              {link.label}
              {link.badge && <span className="nav-link-badge">{link.badge}</span>}
            </Link>
          ))}
        </nav>

        {/* Right Actions: Table Selector & Cart */}
        <div className="nav-actions">
          {/* Table Number Pill */}
          <button
            className="table-pill"
            onClick={() => setShowTablePicker(!showTablePicker)}
            title="Click to switch table number"
          >
            <MapPin size={14} className="table-pill-icon" />
            <span>Table <strong>#{tableNumber}</strong></span>
          </button>

          {/* Quick Table Switcher Dropdown */}
          {showTablePicker && (
            <div className="table-picker-dropdown">
              <div className="table-picker-header">
                <span>Select Your Table (1 - 20)</span>
                <button className="table-picker-close" onClick={() => setShowTablePicker(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="table-picker-grid">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    className={`table-btn ${tableNumber === num ? 'active' : ''}`}
                    onClick={() => {
                      setTableNumber(num);
                      setShowTablePicker(false);
                    }}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart Button */}
          <Link to="/cart" className="nav-cart-btn" aria-label="View Cart">
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="nav-cart-badge">{totalItems}</span>
            )}
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile-drawer">
          <div className="mobile-table-info">
            <span>📍 Currently seated at: <strong>Table #{tableNumber}</strong></span>
            <Link
              to="/qr-access"
              className="btn btn-outline btn-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Scan Table QR
            </Link>
          </div>
          <div className="nav-mobile-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-nav-link ${isActive(link.path) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.label}</span>
                {link.badge && <span className="nav-link-badge">{link.badge}</span>}
              </Link>
            ))}
            <Link
              to="/cart"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>View Cart</span>
              <span className="cart-count-pill">{totalItems} items</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
