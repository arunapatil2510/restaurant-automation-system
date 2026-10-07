import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  MapPin, 
  Utensils, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  AlertCircle,
  ChefHat,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  Globe
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CouponInputBox } from '../components/cart/CouponInputBox';
import { createOrder } from '../services/orderService';
import { SARVAM_SUPPORTED_LANGUAGES, speakKioskSpeech } from '../services/sarvamVoiceService';
import { classifyIntent, INTENT_TYPES } from '../utils/intentClassifier';

export const CartPage = () => {
  const navigate = useNavigate();
  const {
    items,
    tableNumber,
    setTableNumber,
    kioskLanguage,
    setKioskLanguage,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal,
    discount,
    coupon,
    tax,
    totalAmount,
    cookingNotes,
    setCookingNotes,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'upi_demo', 'card_demo'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Cart Voice Assistant State
  const [isCartVoiceActive, setIsCartVoiceActive] = useState(false);
  const [cartVoicePrompt, setCartVoicePrompt] = useState('');
  const [isCartListening, setIsCartListening] = useState(false);
  const cartRecognitionRef = useRef(null);

  const currentLang = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === kioskLanguage) || SARVAM_SUPPORTED_LANGUAGES[0];

  // Start voice recognition on Cart page
  const startCartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (cartRecognitionRef.current) {
        try { cartRecognitionRef.current.abort(); } catch {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = currentLang.sarvamSttCode || kioskLanguage;

      rec.onstart = () => {
        setIsCartListening(true);
      };

      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        if (text) {
          processCartVoiceCommand(text);
        }
      };

      rec.onerror = () => {
        setIsCartListening(false);
      };

      rec.onend = () => {
        setIsCartListening(false);
      };

      cartRecognitionRef.current = rec;
      rec.start();
    } catch {
      setIsCartListening(false);
    }
  };

  const stopCartListening = () => {
    if (cartRecognitionRef.current) {
      try { cartRecognitionRef.current.stop(); } catch {}
    }
    setIsCartListening(false);
  };

  const processCartVoiceCommand = (text) => {
    if (!text) return;
    const lower = text.toLowerCase();

    // 1. Confirm / Place Order / Pay
    if (
      lower.includes('place') || 
      lower.includes('confirm') || 
      lower.includes('order') || 
      lower.includes('pay') || 
      lower.includes('yes') || 
      lower.includes('ಹೌದು') || 
      lower.includes('ಖಚಿತ') || 
      lower.includes('हाँ') || 
      lower.includes('कन्फर्म')
    ) {
      handlePlaceOrder();
      return;
    }

    // 2. Add More / Menu
    if (
      lower.includes('more') || 
      lower.includes('menu') || 
      lower.includes('add') || 
      lower.includes('ಇನ್ನಷ್ಟು') || 
      lower.includes('और')
    ) {
      navigate(`/menu?table=${tableNumber}`);
      return;
    }

    // 3. Clear Cart
    if (
      lower.includes('clear') || 
      lower.includes('cancel') || 
      lower.includes('delete') || 
      lower.includes('ತೆಗೆದುಹಾಕು') || 
      lower.includes('हटाओ')
    ) {
      clearCart();
      return;
    }

    // Unrecognized
    const repPrompt = kioskLanguage === 'kn-IN'
      ? "ಆರ್ಡರ್ ಮಾಡಲು 'Place Order' ಅಥವಾ 'ಹೌದು' ಎಂದು ಹೇಳಿ."
      : kioskLanguage === 'hi-IN'
      ? "ऑर्डर करने के लिए 'Place Order' या 'हाँ' बोलें।"
      : "Say 'Place order' to send to kitchen or 'Add more' to browse dishes.";
    setCartVoicePrompt(repPrompt);
    speakKioskSpeech(repPrompt, kioskLanguage, () => {
      startCartListening();
    });
  };

  // Announce Cart Summary when arrived with items
  useEffect(() => {
    if (items.length > 0 && !confirmedOrder) {
      const summaryText = kioskLanguage === 'kn-IN'
        ? `ನಿಮ್ಮ ಕಾರ್ಟ್‌ನಲ್ಲಿ ${totalItems} ತಿನಿಸುಗಳಿವೆ. ಒಟ್ಟು ಮೊತ್ತ ${totalAmount} ರೂಪಾಯಿಗಳು. ಆರ್ಡರ್ ಖಚಿತಪಡಿಸಲು 'Place Order' ಎಂದು ಹೇಳಿ.`
        : kioskLanguage === 'hi-IN'
        ? `आपकी कार्ट में ${totalItems} आइटम हैं। कुल ${totalAmount} रुपये है। ऑर्डर भेजने के लिए 'Place Order' बोलें।`
        : `You have ${totalItems} items in your cart totaling ${totalAmount} rupees. Say 'Place Order' to send to the kitchen.`;

      setCartVoicePrompt(summaryText);
      setIsCartVoiceActive(true);

      speakKioskSpeech(summaryText, kioskLanguage, () => {
        startCartListening();
      });
    }

    return () => {
      stopCartListening();
    };
  }, [items.length]);

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

  // Real Order Placement to Express + MongoDB Backend
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      const orderPayload = {
        tableNumber,
        customerName: `Table #${tableNumber} Diner`,
        items: items.map(item => ({
          menuItemId: item._id || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type || 'veg',
        })),
        subtotal,
        discount,
        appliedCoupon: coupon?.code || '',
        tax,
        totalAmount,
        paymentMethod,
        notes: cookingNotes,
      };

      const savedOrder = await createOrder(orderPayload);
      setConfirmedOrder(savedOrder);
      clearCart(); // Cart is cleared after successful persistence to MongoDB

      const orderSuccessMsg = kioskLanguage === 'kn-IN'
        ? `ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಆರ್ಡರ್ #${savedOrder.orderNumber} ಅಡುಗೆಮನೆಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.`
        : kioskLanguage === 'hi-IN'
        ? `धन्यवाद! आपका ऑर्डर #${savedOrder.orderNumber} किचन में भेज दिया गया है।`
        : `Thank you! Your order #${savedOrder.orderNumber} has been sent to the kitchen.`;

      speakKioskSpeech(orderSuccessMsg, kioskLanguage);
    } catch (err) {
      console.error('Failed to submit order:', err);
      setOrderError(err.response?.data?.message || err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cart-page-wrapper">
      <div className="container cart-page-content">
        <div className="cart-page-header">
          <div>
            <h1 className="cart-page-title">
              {confirmedOrder ? 'Order Confirmed!' : 'Your Order Summary'}
            </h1>
            <p className="cart-page-subtitle">
              {confirmedOrder
                ? 'Your order has been sent directly to the kitchen chefs.'
                : 'Review your selected dishes before placing your order to the kitchen.'}
            </p>
          </div>

          {/* Table Switcher Badge */}
          <div className="cart-table-badge-box">
            <MapPin size={18} className="cart-table-icon" />
            <div className="cart-table-info">
              <span className="label">Delivering to Table:</span>
              {confirmedOrder ? (
                <strong>Table #{confirmedOrder.tableNumber}</strong>
              ) : (
                <select
                  className="cart-table-select"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Table #{n}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Hands-free Voice Assistant Dialogue Ribbon */}
        {!confirmedOrder && (
          <div className="kiosk-assistant-dialogue-bubble" style={{ marginBottom: '1.5rem', background: 'var(--card-bg, #ffffff)', border: '1.5px solid var(--primary-color, #e11d48)' }}>
            <div className="dialogue-bot-avatar" style={{ background: isCartListening ? 'var(--primary-color, #e11d48)' : undefined }}>
              {isCartListening ? <Mic size={24} className="animate-pulse" /> : <Volume2 size={24} />}
            </div>
            <div className="dialogue-text-wrap" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dialogue-speaker-tag">
                  {isCartListening ? '🔴 LISTENING FOR CART VOICE COMMAND...' : 'RESTOSMART KIOSK ASSISTANT'}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={isCartListening ? stopCartListening : startCartListening}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                >
                  {isCartListening ? <MicOff size={14} /> : <Mic size={14} />} {isCartListening ? 'Mute' : 'Speak'}
                </button>
              </div>
              <p className="dialogue-speech-text" style={{ fontSize: '1rem', marginTop: '0.25rem' }}>
                "{cartVoicePrompt || (kioskLanguage === 'kn-IN' ? 'ಆರ್ಡರ್ ಕಳುಹಿಸಲು "Place order" ಎಂದು ಹೇಳಿ' : kioskLanguage === 'hi-IN' ? 'ऑर्डर भेजने के लिए "Place order" बोलें' : 'Say "Place order" to send to the kitchen or "Add more" to browse menu')}"
              </p>
            </div>
          </div>
        )}

        {/* Order Submission Error Banner */}
        {orderError && (
          <div className="api-error-banner" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            <span>{orderError}</span>
            <button className="btn btn-sm btn-outline" onClick={() => setOrderError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {confirmedOrder ? (
          /* Real Confirmed Order Details Card */
          <div className="order-confirmed-card">
            <div className="confirmed-hero-box">
              <div className="confirmed-icon-pulse">
                <CheckCircle2 size={44} color="#16a34a" />
              </div>
              <span className="order-id-pill">Order #{confirmedOrder.orderNumber}</span>
              <h2 className="confirmed-heading">Thank You! Order Placed Successfully</h2>
              <p className="confirmed-subtext">
                Your order is confirmed for <strong>Table #{confirmedOrder.tableNumber}</strong>. The kitchen team has received your ticket and is preparing your food fresh.
              </p>
            </div>

            {/* Order Progress Status Bar */}
            <div className="order-status-timeline">
              <div className="timeline-step active">
                <div className="timeline-dot">✓</div>
                <span>Order Placed</span>
              </div>
              <div className={`timeline-step ${confirmedOrder.orderStatus === 'preparing' || confirmedOrder.orderStatus === 'ready' || confirmedOrder.orderStatus === 'completed' ? 'active' : ''}`}>
                <div className="timeline-dot"><ChefHat size={14} /></div>
                <span>Preparing in Kitchen</span>
              </div>
              <div className={`timeline-step ${confirmedOrder.orderStatus === 'ready' || confirmedOrder.orderStatus === 'completed' ? 'active' : ''}`}>
                <div className="timeline-dot"><Sparkles size={14} /></div>
                <span>Ready to Serve</span>
              </div>
            </div>

            {/* Ordered Items Receipt */}
            <div className="confirmed-receipt-box">
              <h3 className="receipt-title">
                <Receipt size={18} /> Order Summary ({confirmedOrder.items.length} items)
              </h3>
              <div className="receipt-items-list">
                {confirmedOrder.items.map((it, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span className="receipt-item-name">
                      <strong>{it.quantity}x</strong> {it.name}
                    </span>
                    <span className="receipt-item-price">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-totals-box">
                <div className="receipt-calc-row">
                  <span>Subtotal</span>
                  <span>₹{confirmedOrder.subtotal}</span>
                </div>
                {confirmedOrder.discount > 0 && (
                  <div className="receipt-calc-row discount">
                    <span>Discount ({confirmedOrder.appliedCoupon})</span>
                    <span>- ₹{confirmedOrder.discount}</span>
                  </div>
                )}
                <div className="receipt-calc-row">
                  <span>GST (5%)</span>
                  <span>₹{confirmedOrder.tax}</span>
                </div>
                <div className="receipt-calc-row total">
                  <span>Total Paid / Payable</span>
                  <span>₹{confirmedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="receipt-meta-footer">
                <span>Payment Method: <strong>{confirmedOrder.paymentMethod.toUpperCase()}</strong></span>
                <span>Payment Status: <strong className="text-success">{confirmedOrder.paymentStatus.toUpperCase()}</strong></span>
              </div>

              {confirmedOrder.notes && (
                <div className="receipt-notes-box">
                  <strong>Special Instructions:</strong> {confirmedOrder.notes}
                </div>
              )}
            </div>

            <div className="confirm-actions-row">
              <Link to={`/menu?table=${confirmedOrder.tableNumber}`} className="btn btn-primary btn-lg">
                <Utensils size={18} /> Order More Dishes
              </Link>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => setConfirmedOrder(null)}
              >
                Start New Order
              </button>
            </div>
          </div>
        ) : (
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
              </div>

              {/* Payment Mode */}
              <div className="summary-card">
                <h4 className="summary-card-title">Payment Selection</h4>
                <div className="payment-options-grid">
                  <label className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <Banknote size={18} />
                    <span>Pay at Counter (Cash)</span>
                  </label>

                  <label className={`payment-option ${paymentMethod === 'upi_demo' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi_demo"
                      checked={paymentMethod === 'upi_demo'}
                      onChange={() => setPaymentMethod('upi_demo')}
                    />
                    <Smartphone size={18} />
                    <span>Demo UPI (Instant)</span>
                  </label>

                  <label className={`payment-option ${paymentMethod === 'card_demo' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card_demo"
                      checked={paymentMethod === 'card_demo'}
                      onChange={() => setPaymentMethod('card_demo')}
                    />
                    <CreditCard size={18} />
                    <span>Demo Card (Instant)</span>
                  </label>
                </div>
                <p className="payment-demo-note">
                  🔒 Demo mode for evaluation: Order ticket persists directly to MongoDB backend.
                </p>
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

                <button
                  className="btn btn-primary btn-block btn-lg place-order-btn"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Placing Order with Kitchen...'
                  ) : (
                    <>
                      Place Order for Table #{tableNumber} • ₹{totalAmount} <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
