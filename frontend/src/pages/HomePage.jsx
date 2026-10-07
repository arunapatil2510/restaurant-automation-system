import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  RefreshCw,
  ShoppingBag,
  Volume2,
  Globe,
  Coffee,
  Plus
} from 'lucide-react';
import { getCategories, getMenuItems, getOffers, getRestaurantInfo } from '../services/menuService';
import { FoodCard } from '../components/menu/FoodCard';
import { DishDetailModal } from '../components/menu/DishDetailModal';
import { KioskVoiceSection } from '../components/voice/KioskVoiceSection';
import { VoiceOrderModal } from '../components/voice/VoiceOrderModal';
import { SUPPORTED_LANGUAGES } from '../utils/multilingualVoiceEngine';
import { useCart } from '../context/CartContext';

export const HomePage = () => {
  const navigate = useNavigate();
  const { 
    tableNumber, 
    setTableNumber, 
    totalItems, 
    totalAmount, 
    addItem, 
    kioskLanguage, 
    setKioskLanguage 
  } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allMenuDishes, setAllMenuDishes] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Kiosk UI Options
  const [diningMode, setDiningMode] = useState('dine_in'); // 'dine_in' or 'takeaway'
  const [selectedDish, setSelectedDish] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Touch menu section ref for smooth scrolling
  const touchMenuRef = useRef(null);

  const loadKioskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [restData, cats, items, offers] = await Promise.all([
        getRestaurantInfo(),
        getCategories(),
        getMenuItems(),
        getOffers(),
      ]);
      setRestaurant(restData);
      setCategories(cats);
      setAllMenuDishes(items);
      setSpecials(items.filter((i) => i.isSpecial || i.categorySlug === 'starters' || i.categorySlug === 'maincourse'));
      setActiveOffers(offers);
    } catch (err) {
      console.error('Error loading kiosk data:', err);
      setError('Unable to connect to RESTOSMART kitchen backend. Please verify server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKioskData();
  }, []);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const scrollToTouchMenu = () => {
    if (touchMenuRef.current) {
      touchMenuRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="kiosk-home-container">
      {/* 1. TOP KIOSK HEADER BANNER */}
      <section className="kiosk-top-banner">
        <div className="container kiosk-top-inner">
          {/* Restaurant Branding & Station info */}
          <div className="kiosk-branding-col">
            <div className="kiosk-brand-icon-box">
              <Utensils size={28} />
            </div>
            <div>
              <div className="kiosk-terminal-pill">
                <span className="live-dot" /> SELF-SERVICE ORDERING KIOSK
              </div>
              <h1 className="kiosk-brand-title">
                {restaurant?.name || 'RESTOSMART'}
              </h1>
            </div>
          </div>

          {/* Dining Mode Toggle (Dine-In vs Takeaway) & Table Picker */}
          <div className="kiosk-dining-controls">
            <div className="kiosk-mode-toggle">
              <button
                className={`kiosk-mode-btn ${diningMode === 'dine_in' ? 'active' : ''}`}
                onClick={() => setDiningMode('dine_in')}
              >
                🍽️ Dine-In (Table #{tableNumber})
              </button>
              <button
                className={`kiosk-mode-btn ${diningMode === 'takeaway' ? 'active' : ''}`}
                onClick={() => setDiningMode('takeaway')}
              >
                🛍️ Takeaway / Parcel
              </button>
            </div>

            {diningMode === 'dine_in' && (
              <div className="kiosk-table-selector">
                <MapPin size={15} />
                <span>Table:</span>
                <select
                  className="kiosk-table-select"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Table #{n}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* API Error Notification */}
      {error && (
        <div className="container" style={{ paddingTop: '1rem' }}>
          <div className="api-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={loadKioskData}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* 2. PRIMARY HERO: MULTILINGUAL KIOSK VOICE SECTION */}
      <div className="container">
        <KioskVoiceSection
          menuItems={allMenuDishes}
          activeLanguage={kioskLanguage}
          onLanguageChange={(code) => setKioskLanguage(code)}
          onOpenTouchMenu={scrollToTouchMenu}
        />
      </div>

      {/* 4. ACTIVE OFFERS TICKER STRIP */}
      {!loading && activeOffers.length > 0 && (
        <section className="kiosk-offers-strip container">
          <div className="kiosk-offers-card">
            <div className="offers-strip-left">
              <Tag size={20} className="text-primary-color" />
              <div>
                <span className="offer-pill-badge">{activeOffers[0].code}</span>
                <strong>{activeOffers[0].title}</strong> — {activeOffers[0].description}
              </div>
            </div>
            <Link to="/offers" className="btn btn-ghost btn-sm">
              All Deals <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* 5. TOUCHSCREEN ORDERING SECTION: CATEGORIES & POPULAR DISHES */}
      <section className="kiosk-touch-menu-section container" ref={touchMenuRef}>
        <div className="kiosk-section-header">
          <div>
            <div className="section-badge">
              <Utensils size={14} /> Touch Screen Menu
            </div>
            <h3 className="section-title">Or Browse & Tap to Order</h3>
            <p className="section-subtitle">
              Prefer touching the screen? Select any category to view full dishes or tap popular specials below.
            </p>
          </div>
          <Link to={`/menu?table=${tableNumber}`} className="btn btn-outline btn-md kiosk-view-full-btn">
            View All Dishes ({allMenuDishes.length}) <ArrowRight size={16} />
          </Link>
        </div>

        {/* Category Touch Tiles */}
        <div className="kiosk-category-tiles-grid">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/menu?category=${cat.slug}&table=${tableNumber}`}
              className="kiosk-category-tile"
            >
              <div className="kiosk-cat-icon">{cat.icon || '🍽️'}</div>
              <span className="kiosk-cat-name">{cat.name}</span>
            </Link>
          ))}
        </div>

        {/* Popular Dishes Quick Grid */}
        <div className="kiosk-specials-wrapper">
          <div className="specials-title-bar">
            <div className="specials-badge">
              <Flame size={16} color="#f97316" />
              <strong>Chef's Recommended Favorites</strong>
            </div>
          </div>

          {loading ? (
            <div className="menu-loading-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-food-card" />
              ))}
            </div>
          ) : (
            <div className="food-grid">
              {specials.slice(0, 6).map((dish) => (
                <FoodCard
                  key={dish.id}
                  dish={dish}
                  onOpenDetails={(d) => setSelectedDish(d)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. HOW THE KIOSK WORKS IN 4 STEPS */}
      <section className="kiosk-how-it-works-section container">
        <div className="section-header text-center">
          <h3 className="section-title">How Self-Ordering Works</h3>
          <p className="section-subtitle">4 easy steps to place your meal on the restaurant kiosk</p>
        </div>

        <div className="kiosk-steps-grid">
          <div className="kiosk-step-card">
            <div className="step-badge-num">1</div>
            <div className="step-icon-wrapper"><Globe size={24} /></div>
            <h4>Select Language</h4>
            <p>Pick English, Kannada (ಕನ್ನಡ), or Hindi (हिन्दी) for speech and interface.</p>
          </div>

          <div className="kiosk-step-card highlight">
            <div className="step-badge-num">2</div>
            <div className="step-icon-wrapper"><Mic size={24} /></div>
            <h4>Speak Food Order</h4>
            <p>Speak naturally (e.g. <em>"1 Masala Dosa, 2 Cold Coffee"</em>) and customize spice levels.</p>
          </div>

          <div className="kiosk-step-card">
            <div className="step-badge-num">3</div>
            <div className="step-icon-wrapper"><CheckCircle2 size={24} /></div>
            <h4>Review & Confirm</h4>
            <p>Say <em>"Yes, confirm"</em> or tap Confirm to instantly add dishes to the kiosk cart.</p>
          </div>

          <div className="kiosk-step-card">
            <div className="step-badge-num">4</div>
            <div className="step-icon-wrapper"><Clock size={24} /></div>
            <h4>Pay & Kitchen Prep</h4>
            <p>Proceed to payment, get your order receipt, and watch kitchen live tracking.</p>
          </div>
        </div>
      </section>

      {/* 7. DOCKED PERSISTENT KIOSK ORDER TRAY (BOTTOM BAR) */}
      {totalItems > 0 && (
        <div className="kiosk-docked-order-tray">
          <div className="container tray-inner">
            <div className="tray-left">
              <div className="tray-badge">
                <ShoppingBag size={22} />
                <span className="tray-count">{totalItems}</span>
              </div>
              <div className="tray-summary">
                <span className="tray-title">Your Kiosk Tray ({diningMode === 'dine_in' ? `Table #${tableNumber}` : 'Takeaway'})</span>
                <span className="tray-total">Total: <strong>₹{totalAmount}</strong> (incl. 5% GST)</span>
              </div>
            </div>

            <div className="tray-right">
              <button
                className="btn btn-outline kiosk-tray-mic-btn"
                onClick={() => setIsVoiceModalOpen(true)}
              >
                <Mic size={16} /> Add More by Voice
              </button>
              <Link to="/cart" className="btn btn-primary btn-lg kiosk-tray-pay-btn">
                <span>Proceed to Pay</span> <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dish Details Modal */}
      <DishDetailModal
        dish={selectedDish}
        isOpen={Boolean(selectedDish)}
        onClose={() => setSelectedDish(null)}
      />

      {/* Multilingual Voice Order Modal */}
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        menuItems={allMenuDishes}
      />
    </div>
  );
};
