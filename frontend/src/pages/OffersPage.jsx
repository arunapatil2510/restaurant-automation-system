import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Copy, Check, Utensils, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { getOffers } from '../services/menuService';
import { useCart } from '../context/CartContext';

export const OffersPage = () => {
  const [offersList, setOffersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const { tableNumber, applyCoupon } = useCart();

  const loadOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOffers();
      setOffersList(data);
    } catch (err) {
      console.error('Error fetching offers from Express backend:', err);
      setError('Unable to load offers from server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      applyCoupon(code); // Pre-applies it in cart context
      setTimeout(() => setCopiedCode(null), 3000);
    });
  };

  return (
    <div className="offers-page-wrapper">
      <div className="container offers-content">
        {/* Page Header */}
        <div className="offers-page-header">
          <div className="offers-badge">
            <Tag size={16} /> Exclusive Deals
          </div>
          <h1 className="offers-page-title">Discounts & Promotional Offers</h1>
          <p className="offers-page-subtitle">
            Enjoy great savings on your dine-in meals. Copy any coupon code below to apply at checkout!
          </p>
        </div>

        {/* API Error State */}
        {error && (
          <div className="api-error-banner" style={{ marginBottom: '2rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={loadOffers}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="offers-grid">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-food-card" style={{ height: '220px' }} />
            ))}
          </div>
        ) : offersList.length > 0 ? (
          /* Offers Grid */
          <div className="offers-grid">
            {offersList.map((offer) => (
              <div key={offer.code} className="offer-card">
                <div className="offer-card-top">
                  <span className="offer-badge-pill">{offer.badge || '🔥 Special Offer'}</span>
                  <span className="offer-type-tag">
                    {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} FLAT OFF`}
                  </span>
                </div>

                <div className="offer-card-body">
                  <h3 className="offer-title">{offer.title}</h3>
                  <p className="offer-desc">{offer.description}</p>
                  <div className="offer-meta-terms">
                    <span>Min Order: <strong>₹{offer.minOrderValue}</strong></span>
                    {offer.maxDiscount && (
                      <span>Max Discount: <strong>₹{offer.maxDiscount}</strong></span>
                    )}
                  </div>
                </div>

                <div className="offer-card-footer">
                  <div className="coupon-code-box">
                    <span className="coupon-code-text">{offer.code}</span>
                    <button
                      className={`btn-copy-code ${copiedCode === offer.code ? 'copied' : ''}`}
                      onClick={() => handleCopyCode(offer.code)}
                      aria-label={`Copy coupon code ${offer.code}`}
                    >
                      {copiedCode === offer.code ? (
                        <>
                          <Check size={14} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <Link
                    to={`/menu?table=${tableNumber}`}
                    className="btn btn-outline btn-block"
                    style={{ marginTop: '0.75rem' }}
                  >
                    <Utensils size={15} /> Use on Table #{tableNumber} Menu
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : !error ? (
          <div className="empty-menu-state">
            <Tag size={40} className="empty-state-icon" />
            <h3>No active offers right now</h3>
            <p>Please check back soon for our latest seasonal promotions and discounts.</p>
          </div>
        ) : null}

        {/* Offer Terms Note */}
        <div className="offers-terms-card">
          <div className="terms-header">
            <ShieldCheck size={18} color="var(--primary)" />
            <h4>Coupon Terms & Conditions</h4>
          </div>
          <ul className="terms-list">
            <li>Coupons are applicable on dine-in orders placed for active tables 1 through 20.</li>
            <li>Discounts are automatically calculated on the pre-tax item subtotal.</li>
            <li>Only one promotional code can be applied per order.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
