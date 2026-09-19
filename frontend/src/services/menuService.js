import api from './api';
import { restaurantInfo } from '../data/mockData';

// Helper to ensure both id and _id exist on menu item objects
const normalizeItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    id: item._id ? item._id.toString() : item.id,
    rating: item.rating || 4.6, // Default rating presentation
  };
};

/**
 * Fetch all categories from backend Express API
 */
export const getCategories = async () => {
  try {
    const response = await api.get('/categories');
    if (response.data && response.data.success) {
      return response.data.data.map(cat => ({
        ...cat,
        id: cat._id ? cat._id.toString() : cat.id,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch categories from backend API:', error.message);
    throw error;
  }
};

/**
 * Fetch menu items with optional category, type, search, or special filters
 */
export const getMenuItems = async (filters = {}) => {
  try {
    const params = {};
    if (filters.category && filters.category !== 'all') {
      params.category = filters.category;
    }
    if (filters.type && filters.type !== 'all') {
      params.type = filters.type;
    }
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.isSpecial !== undefined) {
      params.isSpecial = filters.isSpecial;
    }
    if (filters.isAvailable !== undefined) {
      params.isAvailable = filters.isAvailable;
    }
    if (filters.sortBy) {
      params.sort = filters.sortBy;
    }

    const response = await api.get('/menu', { params });
    if (response.data && response.data.success) {
      return response.data.data.map(normalizeItem);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch menu items from backend API:', error.message);
    throw error;
  }
};

/**
 * Fetch single dish details by ID
 */
export const getMenuItemById = async (id) => {
  try {
    const response = await api.get(`/menu/${id}`);
    if (response.data && response.data.success) {
      return normalizeItem(response.data.data);
    }
    throw new Error('Dish not found');
  } catch (error) {
    console.error(`Failed to fetch dish details for ${id}:`, error.message);
    throw error;
  }
};

/**
 * Fetch active promotional offers from backend
 */
export const getOffers = async () => {
  try {
    const response = await api.get('/offers');
    if (response.data && response.data.success) {
      return response.data.data.map(offer => ({
        ...offer,
        id: offer._id ? offer._id.toString() : offer.id,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch offers from backend API:', error.message);
    throw error;
  }
};

/**
 * Validate coupon code against backend API rules
 */
export const validateCoupon = async (code, subtotal) => {
  try {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, message: 'Please enter a coupon code.' };
    }

    const response = await api.get(`/offers/${cleanCode}`);
    if (response.data && response.data.success) {
      const offer = response.data.data;

      if (subtotal < (offer.minOrderValue || 0)) {
        return {
          valid: false,
          message: `Coupon requires a minimum order of ₹${offer.minOrderValue}.`,
        };
      }

      let discount = 0;
      if (offer.discountType === 'percentage') {
        discount = Math.min((subtotal * offer.discountValue) / 100, offer.maxDiscount || 500);
      } else {
        discount = offer.discountValue;
      }

      return {
        valid: true,
        code: offer.code,
        discount: Math.round(discount),
        message: `${offer.title} applied!`,
      };
    }
    return { valid: false, message: 'Invalid coupon code.' };
  } catch (error) {
    return {
      valid: false,
      message: error.response?.data?.message || 'Invalid or expired coupon code.',
    };
  }
};

/**
 * Restaurant branding details
 */
export const getRestaurantInfo = async () => {
  return Promise.resolve({ ...restaurantInfo });
};
