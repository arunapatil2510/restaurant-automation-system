import React, { useState, useEffect } from 'react';
import { ShoppingBag, RefreshCw, Eye, CheckCircle2, Clock, Utensils, AlertCircle, X, ChefHat } from 'lucide-react';
import { getOrders, updateOrderStatus } from '../../services/orderService';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getOrders({ status: statusFilter });
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError('Failed to fetch live orders from backend server.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrders(true);
  }, [statusFilter]);

  // Periodic polling every 4 seconds for live restaurant table orders
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      // Immediately refresh list
      await fetchOrders(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating order status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Live Order Queue</h1>
          <p className="admin-page-subtext">
            Monitor real-time dine-in orders placed by customers from table QR codes & voice assistant.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => fetchOrders(true)}>
          <RefreshCw size={16} /> Refresh Now
        </button>
      </div>

      {error && (
        <div className="api-error-banner" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={() => fetchOrders(true)}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-card">
        {/* Toolbar & Filter Tabs */}
        <div className="admin-table-toolbar">
          <div className="admin-tabs-filter">
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Orders ({orders.length})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'new' ? 'active' : ''}`}
              onClick={() => setStatusFilter('new')}
            >
              New Tickets
            </button>
            <button
              className={`filter-chip ${statusFilter === 'preparing' ? 'active' : ''}`}
              onClick={() => setStatusFilter('preparing')}
            >
              Cooking / Prep
            </button>
            <button
              className={`filter-chip ${statusFilter === 'ready' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ready')}
            >
              Ready to Serve
            </button>
            <button
              className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </button>
          </div>
          <span className="admin-count-tag">Live Polling (4s sync)</span>
        </div>

        {/* Orders Table */}
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Table</th>
                <th>Guest</th>
                <th>Items Ordered</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status Action</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    <p>Loading real-time orders from MongoDB...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <ShoppingBag size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.5rem' }} />
                    <p>No orders matching filter "{statusFilter}".</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id || order.orderNumber}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                    </td>
                    <td>
                      <span className="admin-table-tag">Table #{order.tableNumber}</span>
                    </td>
                    <td>
                      <small>{order.customerName}</small>
                    </td>
                    <td className="admin-order-items-cell">
                      {order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                    </td>
                    <td>
                      <strong>₹{order.totalAmount}</strong>
                    </td>
                    <td>
                      <span className="payment-status-badge">
                        {order.paymentMethod.toUpperCase()} • {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`admin-status-select ${order.orderStatus}`}
                        value={order.orderStatus}
                        disabled={updatingId === order._id}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      >
                        <option value="new">⏳ New Ticket</option>
                        <option value="preparing">🍳 Preparing</option>
                        <option value="ready">🔔 Ready to Serve</option>
                        <option value="completed">✓ Completed</option>
                        <option value="cancelled">✕ Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <small>{formatTime(order.createdAt)}</small>
                    </td>
                    <td>
                      <button
                        className="btn-table-action"
                        onClick={() => setSelectedOrder(order)}
                        title="View full order ticket"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Order Ticket #{selectedOrder.orderNumber}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="ticket-meta-grid">
                <div>
                  <span className="text-muted">Table:</span>
                  <h4>Table #{selectedOrder.tableNumber}</h4>
                </div>
                <div>
                  <span className="text-muted">Placed At:</span>
                  <h4>{new Date(selectedOrder.createdAt).toLocaleTimeString()}</h4>
                </div>
                <div>
                  <span className="text-muted">Current Status:</span>
                  <span className={`admin-order-status ${selectedOrder.orderStatus}`}>
                    {selectedOrder.orderStatus.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Payment:</span>
                  <h4>{selectedOrder.paymentMethod.toUpperCase()} ({selectedOrder.paymentStatus})</h4>
                </div>
              </div>

              <hr style={{ margin: '1rem 0', borderColor: 'var(--border)' }} />

              <h4 style={{ marginBottom: '0.75rem' }}>Ordered Dishes:</h4>
              <div className="ticket-items-list">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="ticket-item-row">
                    <span><strong>{it.quantity}x</strong> {it.name}</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="ticket-totals-box">
                <div className="receipt-calc-row">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="receipt-calc-row discount">
                    <span>Discount ({selectedOrder.appliedCoupon}):</span>
                    <span>- ₹{selectedOrder.discount}</span>
                  </div>
                )}
                <div className="receipt-calc-row">
                  <span>GST (5%):</span>
                  <span>₹{selectedOrder.tax}</span>
                </div>
                <div className="receipt-calc-row total">
                  <span>Total Amount:</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="ticket-cooking-notes">
                  <strong>Chef Instructions:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
