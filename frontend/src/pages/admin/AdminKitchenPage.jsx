import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertTriangle, CheckCircle2, Flame, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { getOrders, updateOrderStatus } from '../../services/orderService';

export const AdminKitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchKitchenOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // Get all active orders
      const data = await getOrders({ limit: 100 });
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
      await updateOrderStatus(orderId, targetStatus);
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

  const queuedOrders = orders.filter(o => o.orderStatus === 'new');
  const cookingOrders = orders.filter(o => o.orderStatus === 'preparing');
  const readyOrders = orders.filter(o => o.orderStatus === 'ready');

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
            <span>Station #1 Live (4s sync)</span>
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
        {/* Column 1: Queued / New */}
        <div className="kds-column">
          <div className="kds-column-header queue">
            <h3>1. Queued / Incoming ({queuedOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {queuedOrders.length === 0 ? (
              <div className="kds-empty-col">No incoming tickets in queue</div>
            ) : (
              queuedOrders.map((ticket) => (
                <div key={ticket._id} className="kds-ticket urgent">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Table #{ticket.tableNumber}</span>
                      <small className="ticket-number">#{ticket.orderNumber}</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.createdAt)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{it.quantity}x</span>
                        <span className="kds-name">{it.name}</span>
                        <span className={`kds-type-dot ${it.type === 'veg' ? 'veg' : 'nonveg'}`} />
                      </div>
                    ))}
                  </div>

                  {ticket.notes && (
                    <div className="kds-notes-box">
                      <MessageSquare size={12} />
                      <span>{ticket.notes}</span>
                    </div>
                  )}

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action start"
                      disabled={updatingId === ticket._id}
                      onClick={() => handleAdvanceStatus(ticket._id, 'preparing')}
                    >
                      <Flame size={15} /> Start Cooking
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Cooking / Preparing */}
        <div className="kds-column">
          <div className="kds-column-header cooking">
            <h3>2. Cooking / In Prep ({cookingOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {cookingOrders.length === 0 ? (
              <div className="kds-empty-col">No active pans cooking</div>
            ) : (
              cookingOrders.map((ticket) => (
                <div key={ticket._id} className="kds-ticket cooking">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Table #{ticket.tableNumber}</span>
                      <small className="ticket-number">#{ticket.orderNumber}</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.createdAt)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{it.quantity}x</span>
                        <span className="kds-name">{it.name}</span>
                        <span className={`kds-type-dot ${it.type === 'veg' ? 'veg' : 'nonveg'}`} />
                      </div>
                    ))}
                  </div>

                  {ticket.notes && (
                    <div className="kds-notes-box">
                      <MessageSquare size={12} />
                      <span>{ticket.notes}</span>
                    </div>
                  )}

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action ready"
                      disabled={updatingId === ticket._id}
                      onClick={() => handleAdvanceStatus(ticket._id, 'ready')}
                    >
                      <CheckCircle2 size={15} /> Mark Dishes Ready
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready for Table Pickup */}
        <div className="kds-column">
          <div className="kds-column-header ready">
            <h3>3. Ready for Service ({readyOrders.length})</h3>
          </div>
          <div className="kds-column-body">
            {readyOrders.length === 0 ? (
              <div className="kds-empty-col">No dishes waiting for pickup</div>
            ) : (
              readyOrders.map((ticket) => (
                <div key={ticket._id} className="kds-ticket ready">
                  <div className="kds-ticket-header">
                    <div>
                      <span className="ticket-table">Table #{ticket.tableNumber}</span>
                      <small className="ticket-number">#{ticket.orderNumber}</small>
                    </div>
                    <span className="ticket-timer">
                      <Clock size={13} /> {getElapsedTime(ticket.createdAt)}
                    </span>
                  </div>

                  <div className="kds-ticket-items">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="kds-item-row">
                        <span className="kds-qty">{it.quantity}x</span>
                        <span className="kds-name">{it.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="kds-ticket-footer">
                    <button
                      className="btn-kds-action serve"
                      disabled={updatingId === ticket._id}
                      onClick={() => handleAdvanceStatus(ticket._id, 'completed')}
                    >
                      ✓ Served to Table #{ticket.tableNumber}
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
