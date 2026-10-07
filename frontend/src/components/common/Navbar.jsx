import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Utensils, 
  ShoppingBag, 
  QrCode, 
  Sparkles, 
  Menu as MenuIcon, 
  X, 
  MapPin, 
  Mic, 
  ShieldAlert,
  Monitor
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { VoiceOrderModal } from '../voice/VoiceOrderModal';
import { getMenuItems } from '../../services/menuService';

export const Navbar = () => {
  const location = useLocation();
  const { totalItems, tableNumber, setTableNumber } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);

  const navLinks = [
    { path: '/', label: 'Kiosk Home', icon: <Monitor size={15} /> },
    { path: '/menu', label: 'Digital Menu', icon: <Utensils size={15} /> },
    { path: '/offers', label: 'Offers', badge: '🔥' },
    { path: '/qr-access', label: 'Table QR', icon: <QrCode size={15} /> },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleOpenVoice = async () => {
    try {
      if (menuItems.length === 0) {
        const items = await getMenuItems();
        setMenuItems(items);
      }
    } catch {
      // Ignored
    }
    setIsVoiceModalOpen(true);
  };

  return (
    <header className="navbar-wrapper">
      <div className="container navbar">
        {/* Brand Logo & Kiosk Station Info */}
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="nav-logo-icon">
            <Utensils size={20} />
          </div>
          <div className="nav-logo-text">
            <div className="nav-brand-title-row">
              <span className="nav-brand-title">RESTOSMART</span>
              <span className="nav-kiosk-chip">KIOSK</span>
            </div>
            <span className="nav-brand-subtitle">Self-Service Voice Ordering</span>
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

        {/* Right Actions: Voice Mic, Table Selector & Cart */}
        <div className="nav-actions">
          {/* Quick Voice Mic Action */}
          <button
            className="nav-voice-quick-btn"
            onClick={handleOpenVoice}
            title="Speak your order"
          >
            <Mic size={16} />
            <span className="voice-btn-text">Voice Order</span>
          </button>

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
            <span>📍 Kiosk Station: <strong>Table #{tableNumber}</strong></span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenVoice();
              }}
            >
              <Mic size={14} /> Voice Order
            </button>
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
              <span>View Order Tray</span>
              <span className="cart-count-pill">{totalItems} items</span>
            </Link>
            <Link
              to="/admin/login"
              className="mobile-nav-link admin-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Admin / Staff Portal</span>
            </Link>
          </div>
        </div>
      )}

      {/* Voice Order Modal */}
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        menuItems={menuItems}
      />
    </header>
  );
};
