import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  QrCode, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  MapPin, 
  Tag, 
  Mic, 
  Flame, 
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getMenuItems, getOffers, getRestaurantInfo } from '../services/menuService';
import { FoodCard } from '../components/menu/FoodCard';
import { DishDetailModal } from '../components/menu/DishDetailModal';
import { useCart } from '../context/CartContext';

export const HomePage = () => {
  const { tableNumber, setTableNumber } = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [specials, setSpecials] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);

  const loadHomeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [restData, items, offers] = await Promise.all([
        getRestaurantInfo(),
        getMenuItems({ isSpecial: true }),
        getOffers(),
      ]);
      setRestaurant(restData);
      setSpecials(items.filter(i => i.isSpecial));
      setActiveOffers(offers);
    } catch (err) {
      console.error('Error loading home data from backend:', err);
      setError('Unable to reach restaurant server. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const features = [
    {
      icon: <QrCode size={26} className="feature-icon qr-color" />,
      title: "Table QR Ordering",
      description: "Scan your table's QR code to browse, customize, and order instantly without waiting for paper menus."
    },
    {
      icon: <Sparkles size={26} className="feature-icon stock-color" />,
      title: "Live Stock Availability",
      description: "Always know what is cooking fresh in the kitchen with real-time in-stock and sold-out dish indicators."
    },
    {
      icon: <Mic size={26} className="feature-icon voice-color" />,
      title: "Voice-Powered Ordering",
      description: "Speak naturally to place your order with hands-free speech recognition and instant dish extraction."
    },
    {
      icon: <Clock size={26} className="feature-icon track-color" />,
      title: "Real-Time Kitchen Tracking",
      description: "Follow your meal's progress step-by-step from kitchen preparation to table delivery."
    }
  ];

  return (
    <div className="home-page-container">
      {/* API Error Notification */}
      {error && (
        <div className="container" style={{ paddingTop: '1rem' }}>
          <div className="api-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={loadHomeData}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* 1. Hero Banner */}
      <section className="hero-section">
        <div className="container hero-grid">
          {/* Left Column: Headline & Action Buttons */}
          <div className="hero-text-content">
            <div className="hero-badge">
              <span className="hero-badge-pulse" />
              <span>Smarter Dining. Better Experience.</span>
            </div>

            <h1 className="hero-title">
              Effortless Dining, <br />
              <span className="text-gradient">Automated at Your Table</span>
            </h1>

            <p className="hero-subtitle">
              Welcome to <strong>{restaurant?.name || 'RESTOSMART'}</strong>. Scan your table QR code, explore our vibrant digital menu, order by voice or touch, and track your food live.
            </p>

            {/* Quick Table Seating Pill */}
            <div className="hero-table-box">
              <div className="hero-table-label">
                <MapPin size={16} />
                <span>Seated at a table?</span>
              </div>
              <div className="hero-table-input-group">
                <span>Table #</span>
                <select
                  className="hero-table-select"
                  value={tableNumber}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    setTableNumber(num);
                  }}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Table {n}</option>
                  ))}
                </select>
                <Link to={`/menu?table=${tableNumber}`} className="btn btn-primary btn-sm">
                  Go to Menu <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Hero CTAs */}
            <div className="hero-action-buttons">
              <Link to={`/menu?table=${tableNumber}`} className="btn btn-primary btn-lg">
                <Utensils size={18} /> View Digital Menu
              </Link>
              <Link to="/qr-access" className="btn btn-outline btn-lg">
                <QrCode size={18} /> Table QR Access
              </Link>
            </div>

            {/* Micro Stats */}
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <span className="stat-number">{loading ? '...' : `${specials.length}+`}</span>
                <span className="stat-label">Chef Specials</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <span className="stat-number">10 min</span>
                <span className="stat-label">Avg Prep Time</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Live Stock Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Graphic */}
          <div className="hero-visual-content">
            <div className="hero-image-card">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=650&fit=crop"
                alt="Restaurant dining experience"
                className="hero-main-img"
              />
              <div className="hero-floating-card top-right">
                <Flame size={18} color="#f97316" />
                <div>
                  <strong>Live Kitchen Active</strong>
                  <span>Fast prep & serving</span>
                </div>
              </div>
              <div className="hero-floating-card bottom-left">
                <ShieldCheck size={18} color="#16a34a" />
                <div>
                  <strong>100% Contactless</strong>
                  <span>Order & pay from phone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Active Offers Ticker Banner */}
      {!loading && activeOffers.length > 0 && (
        <section className="offers-strip-section">
          <div className="container">
            <div className="offers-strip-card">
              <div className="offers-strip-left">
                <Tag size={20} className="offer-tag-icon" />
                <div>
                  <span className="offer-pill-badge">{activeOffers[0].code}</span>
                  <strong>{activeOffers[0].title}</strong> – {activeOffers[0].description}
                </div>
              </div>
              <Link to="/offers" className="btn btn-ghost btn-sm">
                View All Deals <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Today's Specials Showcase */}
      <section className="specials-section section-padding">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <Flame size={14} /> Chef's Recommendations
            </div>
            <h2 className="section-title">Today's Specials</h2>
            <p className="section-subtitle">
              Hand-crafted dishes prepared with fresh authentic ingredients and traditional spices.
            </p>
          </div>

          {loading ? (
            <div className="menu-loading-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-food-card" />
              ))}
            </div>
          ) : specials.length > 0 ? (
            <div className="food-grid">
              {specials.slice(0, 4).map((dish) => (
                <FoodCard
                  key={dish.id}
                  dish={dish}
                  onOpenDetails={(d) => setSelectedDish(d)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-menu-state">
              <h3>No specials available</h3>
              <p>Check our full digital menu for our delicious options.</p>
            </div>
          )}

          <div className="section-cta-center">
            <Link to={`/menu?table=${tableNumber}`} className="btn btn-primary btn-md">
              Browse Full Digital Menu <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Why RESTOSMART / Features Grid */}
      <section className="features-section section-padding bg-tint">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <CheckCircle2 size={14} /> Smart Features
            </div>
            <h2 className="section-title">Why Dine with RESTOSMART?</h2>
            <p className="section-subtitle">
              We eliminate menu delays, miscommunicated orders, and payment hassles.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feat, idx) => (
              <div key={idx} className="feature-card">
                <div className="feature-icon-wrapper">{feat.icon}</div>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-text">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works Steps */}
      <section className="how-it-works-section section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">4 Simple Steps to Enjoy Your Meal</h2>
            <p className="section-subtitle">
              Fast, paperless, and completely in your control.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h4 className="step-title">Scan Table QR</h4>
              <p className="step-desc">Open your phone camera, scan your table code to immediately load the live menu.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h4 className="step-title">Select or Voice Order</h4>
              <p className="step-desc">Browse with filters or speak your order naturally to add dishes to your cart.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h4 className="step-title">Review & Pay</h4>
              <p className="step-desc">Apply discount coupons, add chef cooking notes, and select your payment method.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h4 className="step-title">Track Live Prep</h4>
              <p className="step-desc">Watch your order transition from kitchen preparation to served at your table.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dish Details Modal */}
      <DishDetailModal
        dish={selectedDish}
        isOpen={Boolean(selectedDish)}
        onClose={() => setSelectedDish(null)}
      />
    </div>
  );
};
