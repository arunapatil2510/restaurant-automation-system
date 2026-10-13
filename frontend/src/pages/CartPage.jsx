import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  MapPin, 
  Utensils, 
  ArrowRight, 
  CheckCircle, 
  MessageSquare, 
  ShieldCheck, 
  Receipt,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CouponInputBox } from '../components/cart/CouponInputBox';

export const CartPage = () => {
  const {
    items,
    tableNumber,
    setTableNumber,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal,
    discount,
    coupon,
    couponWarning,
    tax,
    totalAmount,
    cookingNotes,
    setCookingNotes,
  } = useCart();

  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="container cart-empty-container">
          <div className="cart-empty-card">
            <div className="cart-empty-icon-box">
              <ShoppingBag size={48} />
            </div>
            <h2 className="empty-cart-title">Your Cart is Empty</h2>
            <p className="empty-cart-desc">
              You haven't added any delicious dishes to your order yet. Explore our digital menu and start adding items!
            </p>
            <div className="empty-cart-actions">
              <Link to={`/menu?table=${tableNumber}`} className="btn btn-primary btn-lg">
                <Utensils size={18} /> Browse Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrapper">
      <div className="container cart-page-content">
        <div className="cart-page-header">
          <div>
            <h1 className="cart-page-title">Your Order Summary</h1>
            <p className="cart-page-subtitle">
              Review your selected dishes before proceeding to checkout.
            </p>
          </div>

          {/* Table Switcher Badge */}
          <div className="cart-table-badge-box">
            <MapPin size={18} className="cart-table-icon" />
            <div className="cart-table-info">
              <span className="label">Delivering to Table:</span>
              <select
                className="cart-table-select"
                value={tableNumber}
                onChange={(e) => setTableNumber(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Table #{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="cart-layout-grid">
            {/* Left Column: Items List & Cooking Notes */}
            <div className="cart-items-column">
              <div className="cart-items-header-row">
                <h3>Items in Cart ({totalItems})</h3>
                <button
                  className="btn-clear-all"
                  onClick={clearCart}
                  title="Remove all items"
                >
                  <Trash2 size={14} /> Clear Cart
                </button>
              </div>

              {/* Items List */}
              <div className="cart-items-list">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              {/* Cooking Notes / Special Instructions */}
              <div className="cooking-notes-card">
                <div className="cooking-notes-header">
                  <MessageSquare size={16} />
                  <span>Cooking Notes for Chef (Optional)</span>
                </div>
                <textarea
                  className="cooking-notes-textarea"
                  placeholder="e.g. Please make the sambar less spicy, bring extra tissues..."
                  rows={3}
                  value={cookingNotes}
                  onChange={(e) => setCookingNotes(e.target.value)}
                />
              </div>

              {/* Add More Items Link */}
              <div className="add-more-link-box">
                <Link to={`/menu?table=${tableNumber}`} className="btn btn-outline btn-block">
                  <Utensils size={16} /> + Add More Dishes
                </Link>
              </div>
            </div>

            {/* Right Column: Coupon & Financial Summary */}
            <div className="cart-summary-column">
              {/* Coupon Box */}
              <div className="summary-card">
                <h4 className="summary-card-title">Discounts & Offers</h4>
                <CouponInputBox />
                {couponWarning && (
                  <p style={{ fontSize: '0.82rem', color: '#d97706', marginTop: '0.6rem' }}>
                    ⚠️ {couponWarning}
                  </p>
                )}
              </div>

              {/* Bill Details */}
              <div className="summary-card bill-card">
                <h4 className="summary-card-title">
                  <Receipt size={18} /> Bill Details
                </h4>

                <div className="bill-row">
                  <span className="bill-label">Items Subtotal</span>
                  <span className="bill-value">₹{subtotal}</span>
                </div>

                {discount > 0 && (
                  <div className="bill-row discount-row">
                    <span className="bill-label">
                      Coupon Discount ({coupon?.code})
                    </span>
                    <span className="bill-value">- ₹{discount}</span>
                  </div>
                )}

                <div className="bill-row">
                  <span className="bill-label">GST (5%)</span>
                  <span className="bill-value">₹{tax}</span>
                </div>

                <div className="bill-divider" />

                <div className="bill-row total-row">
                  <span className="bill-label">To Pay</span>
                  <span className="bill-value">₹{totalAmount}</span>
                </div>

                <Link
                  to="/checkout"
                  className="btn btn-primary btn-block btn-lg place-order-btn"
                >
                  Proceed to Checkout • ₹{totalAmount} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
