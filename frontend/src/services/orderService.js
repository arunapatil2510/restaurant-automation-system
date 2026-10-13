import api from './api';

/**
 * Order Service
 * Handles customer order placement and status tracking via the Express backend (/api/orders)
 */

/**
 * Place a new order
 * @param {Object} orderData - Full order payload matching backend Order schema
 * @returns {Promise<Object>} Backend API response with created order data
 */
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to place order. Please try again.';
    console.error('orderService.createOrder failed:', message);
    throw new Error(message);
  }
};

/**
 * Fetch order details by MongoDB _id or orderNumber (e.g. ORD-902057)
 * @param {string} orderId - Unique order ID or Order Number
 * @returns {Promise<Object>} Backend API response with order data
 */
export const getOrderById = async (orderId) => {
  try {
    if (!orderId) throw new Error('Order identifier is required');
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      `Failed to fetch order details for '${orderId}'.`;
    console.error(`orderService.getOrderById(${orderId}) failed:`, message);
    throw new Error(message);
  }
};

/**
 * Fetch active orders with optional table or status filters
 * @param {Object} filters - Query parameters { table, status, limit }
 * @returns {Promise<Array>} List of orders
 */
export const getOrders = async (filters = {}) => {
  try {
    const params = {};
    if (filters.table) params.table = filters.table;
    if (filters.status) params.status = filters.status;
    if (filters.limit) params.limit = filters.limit;

    const response = await api.get('/orders', { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch orders.';
    console.error('orderService.getOrders failed:', message);
    throw new Error(message);
  }
};

/**
 * Update an order's lifecycle or payment status
 * @param {string} orderId - Unique order ID or Order Number
 * @param {Object} statusUpdate - { orderStatus, paymentStatus }
 * @returns {Promise<Object>} Updated order data
 */
export const updateOrderStatus = async (orderId, statusUpdate) => {
  try {
    const response = await api.patch(`/orders/${orderId}/status`, statusUpdate);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to update order status.';
    console.error(`orderService.updateOrderStatus(${orderId}) failed:`, message);
    throw new Error(message);
  }
};

export default {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
};
