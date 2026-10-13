import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateCoupon as validateCouponService } from '../services/menuService';
import { createOrder as createOrderApi } from '../services/orderService';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'restosmart_cart_items';
const TABLE_STORAGE_KEY = 'restosmart_table_number';
const COUPON_STORAGE_KEY = 'restosmart_applied_coupon';
const NOTES_STORAGE_KEY = 'restosmart_cooking_notes';
const LAST_ORDER_STORAGE_KEY = 'restosmart_last_order';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tableNumber, setTableNumberState] = useState(() => {
    try {
      const saved = localStorage.getItem(TABLE_STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const [coupon, setCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cookingNotes, setCookingNotes] = useState(() => {
    return localStorage.getItem(NOTES_STORAGE_KEY) || '';
  });

  // Track order submission state and last successfully placed order
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrderState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setLastPlacedOrder = (order) => {
    setLastPlacedOrderState(order);
    if (order) {
      sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(order));
    } else {
      sessionStorage.removeItem(LAST_ORDER_STORAGE_KEY);
    }
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(TABLE_STORAGE_KEY, tableNumber.toString());
  }, [tableNumber]);

  useEffect(() => {
    if (coupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, [coupon]);

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, cookingNotes);
  }, [cookingNotes]);

  // Set table number with boundary checks (1 to 20)
  const setTableNumber = (num) => {
    const parsed = parseInt(num, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
      setTableNumberState(parsed);
    }
  };

  // Add Item to Cart
  const addItem = (item, quantity = 1) => {
    if (!item.isAvailable) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          type: item.type,
          image: item.image,
          prepTime: item.prepTime,
          quantity: Math.max(1, quantity),
        },
      ];
    });
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  // Remove single item
  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    setCookingNotes('');
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(COUPON_STORAGE_KEY);
    localStorage.removeItem(NOTES_STORAGE_KEY);
  };

  // Apply Coupon with metadata for reactive updates
  const applyCoupon = async (code) => {
    const res = await validateCouponService(code, subtotal);
    if (res.valid) {
      const couponData = {
        code: res.code,
        discount: res.discount,
        message: res.message,
        minOrderValue: res.minOrderValue || 0,
        discountType: res.discountType,
        discountValue: res.discountValue,
        maxDiscount: res.maxDiscount || 500,
      };
      setCoupon(couponData);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  // Financial calculations
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Reactive discount calculation based on live subtotal
  let discount = 0;
  let couponWarning = null;

  if (coupon && subtotal > 0) {
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      couponWarning = `Add items worth ₹${coupon.minOrderValue - subtotal} more to use coupon ${coupon.code}.`;
      discount = 0;
    } else if (coupon.discountType === 'percentage') {
      const rawDiscount = (subtotal * (coupon.discountValue || 0)) / 100;
      const cappedDiscount = coupon.maxDiscount
        ? Math.min(rawDiscount, coupon.maxDiscount)
        : rawDiscount;
      discount = Math.round(Math.min(cappedDiscount, subtotal));
    } else if (coupon.discountType === 'flat') {
      discount = Math.min(coupon.discountValue || coupon.discount || 0, subtotal);
    } else {
      discount = Math.min(coupon.discount || 0, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.05); // 5% GST
  const totalAmount = taxableAmount + tax;

  const getItemQuantity = (itemId) => {
    const found = items.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  };

  // Prepare checkout payload matching backend Order schema
  const prepareOrderPayload = (customerDetails = {}) => {
    return {
      tableNumber,
      customerName: (customerDetails.customerName || '').trim() || 'Dine-in Guest',
      phone: (customerDetails.phone || '').trim(),
      items: items.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.type || 'veg',
      })),
      subtotal,
      discount,
      appliedCoupon: coupon && discount > 0 ? coupon.code : '',
      tax,
      totalAmount,
      paymentMethod: customerDetails.paymentMethod || 'cash',
      paymentStatus:
        customerDetails.paymentStatus ||
        (customerDetails.paymentMethod === 'cash' ? 'pending' : 'paid'),
      notes: (customerDetails.notes !== undefined ? customerDetails.notes : cookingNotes).trim(),
    };
  };

  // Place order through backend API
  const placeOrder = async (customerDetails = {}) => {
    if (items.length === 0) {
      const err = 'Cart is empty. Please add items before placing an order.';
      setOrderError(err);
      return { success: false, message: err };
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const payload = prepareOrderPayload(customerDetails);
      const res = await createOrderApi(payload);

      if (res && res.success) {
        const orderData = res.data;
        setLastPlacedOrder(orderData);
        clearCart();
        setOrderLoading(false);
        return { success: true, order: orderData, message: res.message };
      }

      throw new Error(res?.message || 'Failed to place order.');
    } catch (err) {
      const errMsg = err.message || 'An error occurred while placing the order.';
      setOrderError(errMsg);
      setOrderLoading(false);
      return { success: false, message: errMsg };
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        tableNumber,
        setTableNumber,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getItemQuantity,
        totalItems,
        subtotal,
        discount,
        tax,
        totalAmount,
        coupon,
        couponWarning,
        applyCoupon,
        removeCoupon,
        cookingNotes,
        setCookingNotes,
        prepareOrderPayload,
        placeOrder,
        orderLoading,
        orderError,
        lastPlacedOrder,
        setLastPlacedOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
