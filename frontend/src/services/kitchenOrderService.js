import api from './api';

export const getActiveKitchenOrders = async () => {
  const response = await api.get('/kitchen/orders/active');
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to fetch active kitchen orders');
  }
  return response.data.data;
};

export const updateKitchenOrderStatus = async (orderId, status) => {
  const response = await api.patch(
    `/kitchen/orders/${encodeURIComponent(orderId)}/status`,
    { status }
  );
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to update kitchen order status');
  }
  return response.data.data;
};