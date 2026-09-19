import React from 'react';
import { ShoppingBag, RefreshCw, Eye, CheckCircle2, Clock, Utensils } from 'lucide-react';

export const AdminOrdersPage = () => {
  // Sample live orders for structure preview
  const sampleOrders = [
    {
      id: 'ORD-1082',
      table: 'Table 5',
      items: '2x Paneer Tikka, 1x Butter Naan, 2x Mango Lassi',
      total: 580,
      status: 'preparing',
      time: '5 mins ago',
      payment: 'Paid (Online)'
    },
    {
      id: 'ORD-1081',
      table: 'Table 3',
      items: '1x Veg Biryani, 1x Gulab Jamun',
      total: 390,
      status: 'pending',
      time: '12 mins ago',
      payment: 'Pay at Counter'
    },
    {
      id: 'ORD-1080',
      table: 'Table 12',
      items: '2x Dal Makhani, 4x Garlic Naan, 1x Jeera Rice',
      total: 760,
      status: 'ready',
      time: '24 mins ago',
      payment: 'Paid (UPI)'
    },
    {
      id: 'ORD-1079',
      table: 'Takeaway #4',
      items: '1x Paneer Butter Masala, 2x Laccha Paratha',
      total: 380,
      status: 'completed',
      time: '45 mins ago',
      payment: 'Paid (Card)'
    }
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Live Order Queue</h1>
          <p className="admin-page-subtext">
            Monitor real-time dine-in orders placed by customers from table QR codes.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => {}}>
          <RefreshCw size={16} /> Refresh Orders
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-table-toolbar">
          <div className="admin-tabs-filter">
            <button className="filter-chip active">All Orders (4)</button>
            <button className="filter-chip">Pending (1)</button>
            <button className="filter-chip">Preparing (1)</button>
            <button className="filter-chip">Ready (1)</button>
            <button className="filter-chip">Completed (1)</button>
          </div>
          <span className="admin-count-tag">Live Polling Active</span>
        </div>

        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Source / Table</th>
                <th>Items Ordered</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleOrders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.id}</strong></td>
                  <td>
                    <span className="admin-table-tag">{order.table}</span>
                  </td>
                  <td className="admin-order-items-cell">{order.items}</td>
                  <td><strong>₹{order.total}</strong></td>
                  <td><span className="payment-status-badge">{order.payment}</span></td>
                  <td>
                    <span className={`admin-order-status ${order.status}`}>
                      {order.status === 'pending' && '⏳ Pending'}
                      {order.status === 'preparing' && '🍳 Preparing'}
                      {order.status === 'ready' && '🔔 Ready to Serve'}
                      {order.status === 'completed' && '✓ Completed'}
                    </span>
                  </td>
                  <td><small>{order.time}</small></td>
                  <td>
                    <button className="btn-table-action" title="View details">
                      <Eye size={15} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer-note">
          <span>Route structure active: Real-time Socket/API syncing will be hooked in the backend integration phase.</span>
        </div>
      </div>
    </div>
  );
};
