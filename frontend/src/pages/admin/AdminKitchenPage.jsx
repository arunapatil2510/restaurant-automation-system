import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Flame, RefreshCw, AlertCircle } from 'lucide-react';
import { getActiveKitchenOrders, updateKitchenOrderStatus } from '../../services/kitchenOrderService';

export const AdminKitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchKitchenOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getActiveKitchenOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setError('Unable to fetch live tickets from kitchen server.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders(true);
    const interval = setInterval(() => {
      fetchKitchenOrders(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (orderId, targetStatus) => {
    setUpdatingId(orderId);
    try {
      await updateKitchenOrderStatus(orderId, targetStatus);
      await fetchKitchenOrders(false);
    } catch (err) {
      console.error('Failed to advance kitchen order:', err);
      alert('Error updating order: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const getElapsedTime = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins <= 0) return 'Just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  };

  const queuedOrders = orders.filter(order => order.status === 'Pending');
  const cookingOrders = orders.filter(order => order.status === 'Preparing');
  const readyOrders = orders.filter(order => order.status === 'Ready');

  const getItemName = (item) => {
    if (typeof item === 'string') return item;
    return item?.name || item?.itemName || item?.title || 'Order item';
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Kitchen Display System (KDS)</h1>
          <p className="admin-page-subtext">
            Live order processing board for head chefs and station cooks. Real-time ticket advancement.
          </p>
        </div>
        <div className="kds-header-actions">
          <div className="kds-status-indicator">
            <span className="live-dot" />
            <span>Kitchen live · 4s sync</span>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => fetchKitchenOrders(true)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="api-error-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={() => fetchKitchenOrders(true)}>
            Retry
          </button>
        </div>
      )}

      <div className="kds-board-grid">
        {/* Column 1: Pending */}
        <div className="kds-column">
          <div className="kds-column-header queue">
            <h3>Pending ({queuedOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {queuedOrders.length === 0 ? (
              <div className="kds-empty-col">{loading ? 'Loading orders...' : 'No pending orders'}</div>
            ) : (
              queuedOrders.map((ticket) => (
                <div key={ticket.orderId} className="kds-ticket urgent">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Order #{ticket.orderId}</span>
                      <small className="ticket-number">{ticket.items.length} items</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.timestamp)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{item?.quantity ? `${item.quantity}x` : ''}</span>
                        <span className="kds-name">{getItemName(item)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action start"
                      disabled={updatingId === ticket.orderId}
                      onClick={() => handleAdvanceStatus(ticket.orderId, 'Preparing')}
                    >
                      <Flame size={15} /> Start preparing
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="kds-column">
          <div className="kds-column-header cooking">
            <h3>Preparing ({cookingOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {cookingOrders.length === 0 ? (
              <div className="kds-empty-col">{loading ? 'Loading orders...' : 'No orders being prepared'}</div>
            ) : (
              cookingOrders.map((ticket) => (
                <div key={ticket.orderId} className="kds-ticket cooking">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Order #{ticket.orderId}</span>
                      <small className="ticket-number">{ticket.items.length} items</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.timestamp)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{item?.quantity ? `${item.quantity}x` : ''}</span>
                        <span className="kds-name">{getItemName(item)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action ready"
                      disabled={updatingId === ticket.orderId}
                      onClick={() => handleAdvanceStatus(ticket.orderId, 'Ready')}
                    >
                      <CheckCircle2 size={15} /> Mark ready
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="kds-column">
          <div className="kds-column-header ready">
            <h3>Ready ({readyOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {readyOrders.length === 0 ? (
              <div className="kds-empty-col">{loading ? 'Loading orders...' : 'No ready orders'}</div>
            ) : (
              readyOrders.map((ticket) => (
                <div key={ticket.orderId} className="kds-ticket ready">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Order #{ticket.orderId}</span>
                      <small className="ticket-number">{ticket.items.length} items</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.timestamp)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{item?.quantity ? `${item.quantity}x` : ''}</span>
                        <span className="kds-name">{getItemName(item)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action serve"
                      disabled={updatingId === ticket.orderId}
                      onClick={() => handleAdvanceStatus(ticket.orderId, 'Completed')}
                    >
                      <CheckCircle2 size={15} /> Complete order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
