import React, { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const CouponInputBox = () => {
  const { coupon, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setLoading(true);
    setFeedback(null);

    const res = await applyCoupon(couponCode);
    setLoading(false);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setCouponCode('');
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="coupon-box-card">
      {coupon ? (
        <div className="applied-coupon-banner">
          <div className="applied-coupon-info">
            <Tag size={16} className="coupon-icon-active" />
            <div>
              <span className="applied-coupon-code">{coupon.code}</span>
              <span className="applied-coupon-desc">You save ₹{coupon.discount}!</span>
            </div>
          </div>
          <button
            className="btn-remove-coupon"
            onClick={removeCoupon}
            title="Remove coupon"
            aria-label="Remove applied coupon"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <form className="coupon-form" onSubmit={handleApply}>
          <div className="coupon-input-row">
            <Tag size={16} className="coupon-icon" />
            <input
              type="text"
              className="coupon-input"
              placeholder="Enter coupon (e.g. FLAT20)"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setFeedback(null);
              }}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={loading || !couponCode.trim()}
            >
              {loading ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {feedback && (
            <p className={`coupon-feedback ${feedback.type}`}>
              {feedback.type === 'success' ? <Check size={12} /> : null} {feedback.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
};
