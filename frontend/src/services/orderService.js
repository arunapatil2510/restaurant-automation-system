import api from './api';

/**
 * Place a new restaurant dine-in order
 */
export const createOrder = async (orderPayload) => {
  try {
    const response = await api.post('/orders', orderPayload);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to place order');
  } catch (error) {
    console.error('Error placing order to Express API:', error.message);
    throw error;
  }
};

/**
 * Fetch all orders (with optional status or table filters)
 */
export const getOrders = async (filters = {}) => {
  try {
    const params = {};
    if (filters.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters.tableNumber) {
      params.tableNumber = filters.tableNumber;
    }
    if (filters.limit) {
      params.limit = filters.limit;
    }

    const response = await api.get('/orders', { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching orders from Express API:', error.message);
    throw error;
  }
};

/**
 * Fetch single order details by ID or orderNumber
 */
export const getOrderById = async (idOrNumber) => {
  try {
    const response = await api.get(`/orders/${idOrNumber}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error('Order not found');
  } catch (error) {
    console.error(`Error fetching order ${idOrNumber}:`, error.message);
    throw error;
  }
};

/**
 * Update order status (Staff / Admin / Kitchen)
 */
export const updateOrderStatus = async (idOrNumber, orderStatus, paymentStatus) => {
  try {
    const payload = {};
    if (orderStatus) payload.orderStatus = orderStatus;
    if (paymentStatus) payload.paymentStatus = paymentStatus;

    const response = await api.patch(`/orders/${idOrNumber}/status`, payload);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update order status');
  } catch (error) {
    console.error(`Error updating order status for ${idOrNumber}:`, error.message);
    throw error;
  }
};
