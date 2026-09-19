import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, MapPin, Phone, Mail, Clock, ShieldCheck, Heart } from 'lucide-react';
import { restaurantInfo } from '../../data/mockData';

export const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="container footer-content">
        {/* Col 1: Brand & Tagline */}
        <div className="footer-col brand-col">
          <div className="footer-brand">
            <div className="footer-brand-icon">
              <Utensils size={20} />
            </div>
            <span className="footer-brand-title">{restaurantInfo.name}</span>
          </div>
          <p className="footer-description">
            {restaurantInfo.tagline} Discover dishes digitally, customize your orders at the table, and enjoy real-time kitchen tracking.
          </p>
          <div className="footer-badges">
            <span className="footer-pill"><ShieldCheck size={14} /> 100% Hygienic Prep</span>
            <span className="footer-pill">⚡ Fast Table Service</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="footer-col">
          <h4 className="footer-heading">Quick Navigation</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/menu">Digital Menu</Link></li>
            <li><Link to="/offers">Promotional Offers</Link></li>
            <li><Link to="/qr-access">Table QR Codes</Link></li>
            <li><Link to="/cart">Your Cart</Link></li>
          </ul>
        </div>

        {/* Col 3: Categories */}
        <div className="footer-col">
          <h4 className="footer-heading">Menu Highlights</h4>
          <ul className="footer-links">
            <li><Link to="/menu?category=starters">Crispy Starters</Link></li>
            <li><Link to="/menu?category=maincourse">Main Course Curries</Link></li>
            <li><Link to="/menu?category=biryani">Hyderabadi & Dum Biryani</Link></li>
            <li><Link to="/menu?category=beverages">Filter Coffee & Beverages</Link></li>
            <li><Link to="/menu?category=desserts">Authentic Desserts</Link></li>
          </ul>
        </div>

        {/* Col 4: Contact & Timing */}
        <div className="footer-col contact-col">
          <h4 className="footer-heading">Visit Us</h4>
          <ul className="footer-contact-list">
            <li>
              <MapPin size={16} className="footer-icon" />
              <span>{restaurantInfo.address}</span>
            </li>
            <li>
              <Clock size={16} className="footer-icon" />
              <span>{restaurantInfo.timing}</span>
            </li>
            <li>
              <Phone size={16} className="footer-icon" />
              <span>{restaurantInfo.phone}</span>
            </li>
            <li>
              <Mail size={16} className="footer-icon" />
              <span>{restaurantInfo.email}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom-bar">
        <div className="container footer-bottom-content">
          <span>© {new Date().getFullYear()} {restaurantInfo.name} – Restaurant Automation System.</span>
          <span className="footer-credit">
            Built with <Heart size={14} color="#e11d48" fill="#e11d48" style={{ display: 'inline', verticalAlign: 'middle' }} /> for smarter dining.
          </span>
        </div>
      </div>
    </footer>
  );
};
