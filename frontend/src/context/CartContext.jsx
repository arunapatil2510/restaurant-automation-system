import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateCoupon as validateCouponService } from '../services/menuService';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'restosmart_cart_items';
const TABLE_STORAGE_KEY = 'restosmart_table_number';
const COUPON_STORAGE_KEY = 'restosmart_applied_coupon';
const NOTES_STORAGE_KEY = 'restosmart_cooking_notes';

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

  // Apply Coupon
  const applyCoupon = async (code) => {
    const res = await validateCouponService(code, subtotal);
    if (res.valid) {
      setCoupon({ code: res.code, discount: res.discount, message: res.message });
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
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.05); // 5% GST
  const totalAmount = taxableAmount + tax;

  const getItemQuantity = (itemId) => {
    const found = items.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
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
        applyCoupon,
        removeCoupon,
        cookingNotes,
        setCookingNotes,
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
