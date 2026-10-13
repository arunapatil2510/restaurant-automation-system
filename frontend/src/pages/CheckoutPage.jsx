import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  User,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Utensils,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Tag,
  Check,
  Copy,
  Home,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { VegBadge } from '../components/common/Badge';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const {
    items,
    tableNumber,
    setTableNumber,
    totalItems,
    subtotal,
    discount,
    coupon,
    couponWarning,
    tax,
    totalAmount,
    cookingNotes,
    setCookingNotes,
    placeOrder,
    orderLoading,
    orderError,
    lastPlacedOrder,
    setLastPlacedOrder,
  } = useCart();

  // Customer details form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'upi_demo', 'card_demo'
  const [upiVpa, setUpiVpa] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [cardNumber, setCardNumber] = useState('4532 8901 2345 6789');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('882');

  const [errors, setErrors] = useState({});
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  // If order was already successfully placed
  const confirmedOrder = placedOrderDetails || lastPlacedOrder;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('restosmart@upi').then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    const trimmedName = customerName.trim();
    const trimmedPhone = phone.trim();

    // 0. Cart and totals validation
    if (!items || items.length === 0) {
      errs.general = 'Your cart is empty. Please select dishes before placing an order.';
    } else if (items.some((it) => !it.quantity || it.quantity <= 0)) {
      errs.general = 'Cart contains invalid item quantities. Please review your cart.';
    } else if (totalAmount <= 0) {
      errs.general = 'Payable total amount must be greater than ₹0.';
    }

    if (!tableNumber || tableNumber < 1) {
      errs.tableNumber = 'A valid table number is required.';
    }

    // 1. Customer Name Validation
    if (!trimmedName) {
      errs.customerName = 'Please enter your full name.';
    } else if (trimmedName.length < 2) {
      errs.customerName = 'Name must be at least 2 characters.';
    }

    // 2. Phone Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!trimmedPhone) {
      errs.phone = 'Please enter your 10-digit mobile number.';
    } else if (!phoneRegex.test(trimmedPhone)) {
      errs.phone = 'Please enter a valid 10-digit Indian phone number (e.g. 9876543210).';
    }

    // 3. Payment Method Validation
    if (!['cash', 'upi_demo', 'card_demo'].includes(paymentMethod)) {
      errs.paymentMethod = 'Please select a valid payment option.';
    }

    if (paymentMethod === 'card_demo') {
      const cleanCard = (cardNumber || '').replace(/\D/g, '');
      if (cleanCard.length !== 16) {
        errs.cardNumber = 'Card number must be exactly 16 digits.';
      }
      const expiryParts = (cardExpiry || '').trim().split('/');
      if (
        expiryParts.length !== 2 ||
        !/^\d{2}$/.test(expiryParts[0]) ||
        !/^\d{2}$/.test(expiryParts[1])
      ) {
        errs.cardExpiry = 'Enter valid MM/YY expiry (e.g. 12/28).';
      } else {
        const month = parseInt(expiryParts[0], 10);
        if (month < 1 || month > 12) {
          errs.cardExpiry = 'Expiry month must be between 01 and 12.';
        }
      }
      const cleanCvv = (cardCvv || '').replace(/\D/g, '');
      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        errs.cardCvv = 'Enter 3 or 4 digit CVV.';
      }
    }

    if (paymentMethod === 'upi_demo' && upiVpa.trim()) {
      if (!upiVpa.includes('@')) {
        errs.upiVpa = 'UPI ID must contain "@" (e.g. mobile@upi).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      return;
    }

    if (orderLoading) return; // Prevent multiple clicks

    if (!validateForm()) {
      return;
    }

    const orderPayload = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
      notes: cookingNotes,
    };

    const result = await placeOrder(orderPayload);
    if (result.success && result.order) {
      setPlacedOrderDetails(result.order);
    }
  };

  // If cart is empty and no confirmed order is shown
  if (items.length === 0 && !confirmedOrder) {
    return (
      <div className="cart-page-wrapper">
        <div className="container cart-empty-container">
          <div className="cart-empty-card">
            <div className="cart-empty-icon-box">
              <ShoppingBag size={48} />
            </div>
            <h2 className="empty-cart-title">Your Cart is Empty</h2>
            <p className="empty-cart-desc">
              Cannot proceed to checkout without any dishes selected. Please visit our digital menu to add items.
            </p>
            <div className="empty-cart-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/cart" className="btn btn-outline btn-lg">
                <ArrowLeft size={18} /> View Cart
              </Link>
              <Link to={`/menu?table=${tableNumber}`} className="btn btn-primary btn-lg">
                <Utensils size={18} /> Browse Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Order Confirmation Screen
  if (confirmedOrder) {
    return (
      <div className="cart-page-wrapper">
        <div className="container" style={{ maxWidth: '720px' }}>
          <div className="order-confirmed-banner">
            <div className="confirm-icon-box">
              <CheckCircle size={52} color="#16a34a" />
            </div>
            <h2>Order Placed Successfully! 🎉</h2>
            <p>
              Your order has been transmitted directly to our kitchen station for Table #{confirmedOrder.tableNumber}.
            </p>

            {/* Receipt Summary Card */}
            <div className="checkout-receipt-box">
              <div className="checkout-receipt-header">
                <div className="receipt-order-num">
                  <span className="label">Order Number:</span>
                  <span className="val">{confirmedOrder.orderNumber}</span>
                  {confirmedOrder._id && confirmedOrder._id !== confirmedOrder.orderNumber && (
                    <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      ID: {confirmedOrder._id}
                    </small>
                  )}
                </div>
                <div className="receipt-badge">
                  <span className="live-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginRight: 6 }} />
                  {confirmedOrder.orderStatus === 'new' ? 'Received by Kitchen' : confirmedOrder.orderStatus.toUpperCase()}
                </div>
              </div>

              <div className="checkout-receipt-meta">
                <div>
                  <span className="meta-label">Dine-in Table:</span>
                  <strong>Table #{confirmedOrder.tableNumber}</strong>
                </div>
                <div>
                  <span className="meta-label">Customer Name:</span>
                  <strong>{confirmedOrder.customerName}</strong>
                </div>
                <div>
                  <span className="meta-label">Contact Phone:</span>
                  <strong>{confirmedOrder.phone}</strong>
                </div>
                <div>
                  <span className="meta-label">Payment Mode:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <strong>
                      {confirmedOrder.paymentMethod === 'cash'
                        ? 'Pay at Counter (Cash)'
                        : confirmedOrder.paymentMethod === 'upi_demo'
                        ? 'Demo UPI'
                        : 'Demo Card'}
                    </strong>
                    <span className={`payment-status-pill ${confirmedOrder.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                      {confirmedOrder.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
                {confirmedOrder.createdAt && (
                  <div>
                    <span className="meta-label">Ordered At:</span>
                    <strong>{new Date(confirmedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                )}
              </div>

              {/* Items List in Receipt */}
              <div className="receipt-items-list">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Ordered Items ({confirmedOrder.items?.length || 0}):
                </h4>
                {confirmedOrder.items?.map((it, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <div className="receipt-item-name">
                      <VegBadge type={it.type} />
                      <span>
                        {it.name}{' '}
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                          × {it.quantity} (₹{it.price} each)
                        </span>
                      </span>
                    </div>
                    <span className="receipt-item-price">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Chef Notes if entered */}
              {confirmedOrder.notes && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chef Notes: </span>
                  <span>{confirmedOrder.notes}</span>
                </div>
              )}

              {/* Financial Totals */}
              <div className="receipt-totals-box">
                <div className="bill-row">
                  <span>Subtotal</span>
                  <span>₹{confirmedOrder.subtotal}</span>
                </div>
                {confirmedOrder.discount > 0 && (
                  <div className="bill-row discount-row">
                    <span>Coupon Discount {confirmedOrder.appliedCoupon ? `(${confirmedOrder.appliedCoupon})` : ''}</span>
                    <span>- ₹{confirmedOrder.discount}</span>
                  </div>
                )}
                <div className="bill-row">
                  <span>GST (5%)</span>
                  <span>₹{confirmedOrder.tax}</span>
                </div>
                <div className="bill-divider" />
                <div className="bill-row total-row" style={{ marginBottom: 0 }}>
                  <span>Total Amount</span>
                  <span>₹{confirmedOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="confirm-actions-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setPlacedOrderDetails(null);
                  setLastPlacedOrder(null);
                  navigate(`/menu?table=${confirmedOrder.tableNumber}`);
                }}
              >
                <Utensils size={16} /> Return to Menu / Order More
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setPlacedOrderDetails(null);
                  setLastPlacedOrder(null);
                  navigate('/');
                }}
              >
                <Home size={16} /> Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Checkout Page
  return (
    <div className="cart-page-wrapper">
      <div className="container cart-page-content">
        {/* Navigation & Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/cart" className="checkout-back-link">
            <ArrowLeft size={16} /> Back to Cart
          </Link>
        </div>

        <div className="cart-page-header">
          <div>
            <h1 className="cart-page-title">Checkout & Order Placement</h1>
            <p className="cart-page-subtitle">
              Provide guest details, select your payment method, and send order directly to the kitchen.
            </p>
          </div>

          {/* Table Switcher Badge */}
          <div className="cart-table-badge-box">
            <MapPin size={18} className="cart-table-icon" />
            <div className="cart-table-info">
              <span className="label">Delivering to Table:</span>
              <select
                aria-label="Select dining table number"
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

        {/* Global Error Banner if API submission fails or validation error occurs */}
        {(orderError || errors.general) && (
          <div className="api-error-banner" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            <span>{orderError || errors.general}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="cart-layout-grid">
          {/* Left Column: Customer Information & Payment Method */}
          <div className="cart-items-column">
            {/* Step 1: Customer Details Card */}
            <div className="summary-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="summary-card-title">
                <span className="checkout-step-badge">1</span>
                <User size={18} color="var(--primary)" /> Guest Information
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Your name and phone number will be attached to Table #{tableNumber}'s live kitchen order ticket.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="customerName" className="form-label">
                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="field-icon" />
                    <input
                      id="customerName"
                      type="text"
                      className={`form-input with-icon ${errors.customerName ? 'input-error' : ''}`}
                      placeholder="e.g. Aarav Sharma"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.customerName) {
                          setErrors((prev) => ({ ...prev, customerName: null }));
                        }
                      }}
                    />
                  </div>
                  {errors.customerName && (
                    <span className="form-error-text">{errors.customerName}</span>
                  )}
                </div>

                {/* Mobile Phone */}
                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    Mobile Phone <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Phone size={16} className="field-icon" />
                    <input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      className={`form-input with-icon ${errors.phone ? 'input-error' : ''}`}
                      placeholder="10-digit mobile number (e.g. 9876543210)"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPhone(val);
                        if (errors.phone) {
                          setErrors((prev) => ({ ...prev, phone: null }));
                        }
                      }}
                    />
                  </div>
                  {errors.phone && (
                    <span className="form-error-text">{errors.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Special Instructions / Cooking Notes */}
            <div className="summary-card" style={{ marginBottom: '1.5rem' }}>
              <div className="cooking-notes-header">
                <MessageSquare size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Cooking Notes for Chef (Optional)</span>
              </div>
              <textarea
                className="cooking-notes-textarea"
                placeholder="e.g. Please make the curry less spicy, provide extra spoons..."
                rows={3}
                value={cookingNotes}
                onChange={(e) => setCookingNotes(e.target.value)}
              />
            </div>

            {/* Step 2: Payment Mode Selection & Details */}
            <div className="summary-card">
              <h3 className="summary-card-title">
                <span className="checkout-step-badge">2</span>
                <Receipt size={18} color="var(--primary)" /> Payment Method
              </h3>
              
              <div className="payment-options-grid">
                {/* 1. Cash Option */}
                <label className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => {
                      setPaymentMethod('cash');
                      setErrors((prev) => ({
                        ...prev,
                        paymentMethod: null,
                        cardNumber: null,
                        cardExpiry: null,
                        cardCvv: null,
                        upiVpa: null,
                      }));
                    }}
                  />
                  <Banknote size={18} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Pay at Counter (Cash)</div>
                    <small style={{ color: 'var(--text-secondary)' }}>Pay cash or card to cashier after dining (Status: Pending)</small>
                  </div>
                </label>

                {/* 2. Demo UPI Option */}
                <label className={`payment-option ${paymentMethod === 'upi_demo' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi_demo"
                    checked={paymentMethod === 'upi_demo'}
                    onChange={() => {
                      setPaymentMethod('upi_demo');
                      setErrors((prev) => ({
                        ...prev,
                        paymentMethod: null,
                        cardNumber: null,
                        cardExpiry: null,
                        cardCvv: null,
                        upiVpa: null,
                      }));
                    }}
                  />
                  <Smartphone size={18} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Demo UPI (Simulation)</div>
                    <small style={{ color: 'var(--text-secondary)' }}>Instant simulated QR scan / VPA (Status: Paid)</small>
                  </div>
                </label>

                {/* 3. Demo Card Option */}
                <label className={`payment-option ${paymentMethod === 'card_demo' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card_demo"
                    checked={paymentMethod === 'card_demo'}
                    onChange={() => {
                      setPaymentMethod('card_demo');
                      setErrors((prev) => ({
                        ...prev,
                        paymentMethod: null,
                        cardNumber: null,
                        cardExpiry: null,
                        cardCvv: null,
                        upiVpa: null,
                      }));
                    }}
                  />
                  <CreditCard size={18} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Demo Card (Simulation)</div>
                    <small style={{ color: 'var(--text-secondary)' }}>Simulated Visa / Mastercard transaction (Status: Paid)</small>
                  </div>
                </label>
              </div>

              {/* Interactive Payment Details for Selected Method */}
              {paymentMethod === 'cash' && (
                <div className="payment-method-details-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#166534', fontWeight: 600 }}>
                    <Banknote size={18} />
                    <span>Pay at Cashier Counter</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.5, margin: 0 }}>
                    Your order will be sent to the kitchen immediately. You can settle the bill of <strong>₹{totalAmount}</strong> at the restaurant counter after dining.
                  </p>
                </div>
              )}

              {paymentMethod === 'upi_demo' && (
                <div className="payment-method-details-box">
                  <div className="upi-simulation-content">
                    <div className="upi-qr-wrapper">
                      <QRCodeSVG
                        value={`upi://pay?pa=restosmart@bank&pn=RESTOSMART&am=${totalAmount}&tn=Table_${tableNumber}_Order`}
                        size={130}
                        level="M"
                      />
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Scan with any UPI App (GPay, PhonePe, Paytm)
                    </p>
                    <div className="upi-id-pill">
                      <span>UPI ID: <strong>restosmart@upi</strong></span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        onClick={handleCopyUpi}
                      >
                        {copiedUpi ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>

                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Your UPI ID (optional, e.g. name@okhdfcbank)"
                        value={upiVpa}
                        onChange={(e) => {
                          setUpiVpa(e.target.value);
                          if (errors.upiVpa) {
                            setErrors((prev) => ({ ...prev, upiVpa: null }));
                          }
                        }}
                        style={{ fontSize: '0.85rem' }}
                      />
                      {errors.upiVpa && <span className="form-error-text">{errors.upiVpa}</span>}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'card_demo' && (
                <div className="payment-method-details-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    <CreditCard size={18} />
                    <span>Demo Card Details</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Card Number</label>
                    <input
                      type="text"
                      className={`form-input ${errors.cardNumber ? 'input-error' : ''}`}
                      value={cardNumber}
                      onChange={(e) => {
                        setCardNumber(e.target.value);
                        if (errors.cardNumber) {
                          setErrors((prev) => ({ ...prev, cardNumber: null }));
                        }
                      }}
                      placeholder="16-digit card number"
                      maxLength={19}
                    />
                    {errors.cardNumber && <span className="form-error-text">{errors.cardNumber}</span>}
                  </div>

                  <div className="card-inputs-grid">
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Expiry</label>
                      <input
                        type="text"
                        className={`form-input ${errors.cardExpiry ? 'input-error' : ''}`}
                        value={cardExpiry}
                        onChange={(e) => {
                          setCardExpiry(e.target.value);
                          if (errors.cardExpiry) {
                            setErrors((prev) => ({ ...prev, cardExpiry: null }));
                          }
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                      {errors.cardExpiry && <span className="form-error-text">{errors.cardExpiry}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>CVV</label>
                      <input
                        type="password"
                        className={`form-input ${errors.cardCvv ? 'input-error' : ''}`}
                        value={cardCvv}
                        onChange={(e) => {
                          setCardCvv(e.target.value);
                          if (errors.cardCvv) {
                            setErrors((prev) => ({ ...prev, cardCvv: null }));
                          }
                        }}
                        placeholder="CVV"
                        maxLength={4}
                      />
                      {errors.cardCvv && <span className="form-error-text">{errors.cardCvv}</span>}
                    </div>
                  </div>
                </div>
              )}

              <p className="payment-demo-note" style={{ marginTop: '0.85rem' }}>
                🔒 Safe Demonstration Mode: Simulated transaction only. No real money or bank charges occur. Sensitive card data is never transmitted.
              </p>
            </div>
          </div>

          {/* Right Column: Order Items Summary & Final Bill */}
          <div className="cart-summary-column">
            {/* Order Items Review */}
            <div className="summary-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 className="summary-card-title" style={{ margin: 0 }}>
                  Order Items ({totalItems})
                </h4>
                <Link to="/cart" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Edit Cart
                </Link>
              </div>

              <div className="checkout-items-list">
                {items.map((item) => (
                  <div key={item.id} className="checkout-item-compact-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <VegBadge type={item.type} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          ₹{item.price} × {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Bill Details */}
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
                    Coupon Discount {coupon?.code ? `(${coupon.code})` : ''}
                  </span>
                  <span className="bill-value">- ₹{discount}</span>
                </div>
              )}

              {couponWarning && (
                <div style={{ fontSize: '0.78rem', color: '#d97706', marginBottom: '0.5rem' }}>
                  ⚠️ {couponWarning}
                </div>
              )}

              <div className="bill-row">
                <span className="bill-label">GST (5%)</span>
                <span className="bill-value">₹{tax}</span>
              </div>

              <div className="bill-divider" />

              <div className="bill-row total-row">
                <span className="bill-label">Total to Pay</span>
                <span className="bill-value">₹{totalAmount}</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg place-order-btn"
                disabled={orderLoading || items.length === 0}
              >
                {orderLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processing & Placing Order...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'cash' ? 'Confirm Order' : 'Pay & Place Order'} • ₹{totalAmount}
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <Link to="/cart" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ← Return to Review Cart
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
