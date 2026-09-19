import React from 'react';
import { ChefHat, Clock, AlertTriangle, CheckCircle2, Flame, ArrowRight } from 'lucide-react';

export const AdminKitchenPage = () => {
  const sampleTickets = [
    {
      id: 'KDS-1082',
      table: 'Table 5',
      elapsed: '6 mins',
      status: 'cooking',
      urgent: false,
      items: [
        { name: 'Paneer Tikka', qty: 2, notes: 'Extra crispy' },
        { name: 'Butter Naan', qty: 1, notes: 'Hot' },
        { name: 'Mango Lassi', qty: 2, notes: '' },
      ]
    },
    {
      id: 'KDS-1081',
      table: 'Table 3',
      elapsed: '14 mins',
      status: 'queued',
      urgent: true,
      items: [
        { name: 'Veg Biryani', qty: 1, notes: 'Medium spice' },
        { name: 'Gulab Jamun', qty: 1, notes: 'Warm' },
      ]
    },
    {
      id: 'KDS-1080',
      table: 'Table 12',
      elapsed: '22 mins',
      status: 'ready',
      urgent: false,
      items: [
        { name: 'Dal Makhani', qty: 2, notes: '' },
        { name: 'Garlic Naan', qty: 4, notes: '' },
        { name: 'Jeera Rice', qty: 1, notes: '' },
      ]
    }
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Kitchen Display System (KDS)</h1>
          <p className="admin-page-subtext">
            Live order processing station for head chefs and kitchen staff.
          </p>
        </div>
        <div className="kds-status-indicator">
          <span className="live-dot"></span>
          <span>Station Active (Kitchen #1)</span>
        </div>
      </div>

      <div className="kds-board-grid">
        {/* Queued Column */}
        <div className="kds-column">
          <div className="kds-column-header queue">
            <h3>Queued (1)</h3>
          </div>
          <div className="kds-column-body">
            {sampleTickets.filter(t => t.status === 'queued').map(ticket => (
              <div key={ticket.id} className="kds-ticket urgent">
                <div className="kds-ticket-header">
                  <span className="ticket-table">{ticket.table}</span>
                  <span className="ticket-timer"><Clock size={13} /> {ticket.elapsed}</span>
                </div>
                <div className="kds-ticket-items">
                  {ticket.items.map((it, idx) => (
                    <div key={idx} className="kds-item-row">
                      <span className="kds-qty">{it.qty}x</span>
                      <span className="kds-name">{it.name}</span>
                      {it.notes && <span className="kds-notes">({it.notes})</span>}
                    </div>
                  ))}
                </div>
                <div className="kds-ticket-footer">
                  <button className="btn-kds-action start">
                    <Flame size={15} /> Start Cooking
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="kds-column">
          <div className="kds-column-header cooking">
            <h3>Cooking / In Prep (1)</h3>
          </div>
          <div className="kds-column-body">
            {sampleTickets.filter(t => t.status === 'cooking').map(ticket => (
              <div key={ticket.id} className="kds-ticket cooking">
                <div className="kds-ticket-header">
                  <span className="ticket-table">{ticket.table}</span>
                  <span className="ticket-timer"><Clock size={13} /> {ticket.elapsed}</span>
                </div>
                <div className="kds-ticket-items">
                  {ticket.items.map((it, idx) => (
                    <div key={idx} className="kds-item-row">
                      <span className="kds-qty">{it.qty}x</span>
                      <span className="kds-name">{it.name}</span>
                      {it.notes && <span className="kds-notes">({it.notes})</span>}
                    </div>
                  ))}
                </div>
                <div className="kds-ticket-footer">
                  <button className="btn-kds-action ready">
                    <CheckCircle2 size={15} /> Mark Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to Serve Column */}
        <div className="kds-column">
          <div className="kds-column-header ready">
            <h3>Ready for Pickup (1)</h3>
          </div>
          <div className="kds-column-body">
            {sampleTickets.filter(t => t.status === 'ready').map(ticket => (
              <div key={ticket.id} className="kds-ticket ready">
                <div className="kds-ticket-header">
                  <span className="ticket-table">{ticket.table}</span>
                  <span className="ticket-timer"><Clock size={13} /> {ticket.elapsed}</span>
                </div>
                <div className="kds-ticket-items">
                  {ticket.items.map((it, idx) => (
                    <div key={idx} className="kds-item-row">
                      <span className="kds-qty">{it.qty}x</span>
                      <span className="kds-name">{it.name}</span>
                    </div>
                  ))}
                </div>
                <div className="kds-ticket-footer">
                  <button className="btn-kds-action serve">
                    ✓ Handed to Waiter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
