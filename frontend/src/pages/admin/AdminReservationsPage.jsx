import React from 'react';
import { CalendarCheck, Users, Phone, Mail, Clock, Check, X } from 'lucide-react';

export const AdminReservationsPage = () => {
  const sampleReservations = [
    {
      id: 'RES-301',
      customerName: 'Rahul Sharma',
      phone: '+91 98765 43210',
      guests: '4 Guests',
      date: 'Today, 8:00 PM',
      table: 'Table 7 (Window)',
      status: 'confirmed'
    },
    {
      id: 'RES-302',
      customerName: 'Priya Mehta',
      phone: '+91 98234 56789',
      guests: '2 Guests',
      date: 'Today, 8:30 PM',
      table: 'Table 2',
      status: 'confirmed'
    },
    {
      id: 'RES-303',
      customerName: 'Amit Verma',
      phone: '+91 97123 45678',
      guests: '6 Guests',
      date: 'Tomorrow, 7:30 PM',
      table: 'Unassigned',
      status: 'pending'
    }
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Table Reservations</h1>
          <p className="admin-page-subtext">
            Review, confirm, and assign restaurant seating for incoming guest bookings.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-toolbar">
          <div className="admin-tabs-filter">
            <button className="filter-chip active">All Bookings (3)</button>
            <button className="filter-chip">Today (2)</button>
            <button className="filter-chip">Pending Confirmation (1)</button>
          </div>
        </div>

        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Guest Details</th>
                <th>Party Size</th>
                <th>Reservation Time</th>
                <th>Assigned Table</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleReservations.map((res) => (
                <tr key={res.id}>
                  <td><strong>{res.id}</strong></td>
                  <td>
                    <div>
                      <strong>{res.customerName}</strong>
                      <div className="text-muted"><small>{res.phone}</small></div>
                    </div>
                  </td>
                  <td>
                    <span className="guest-badge"><Users size={14} /> {res.guests}</span>
                  </td>
                  <td>
                    <span className="time-badge"><Clock size={14} /> {res.date}</span>
                  </td>
                  <td><strong>{res.table}</strong></td>
                  <td>
                    <span className={`admin-order-status ${res.status}`}>
                      {res.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      {res.status === 'pending' ? (
                        <>
                          <button className="btn-action-icon confirm" title="Confirm booking">
                            <Check size={16} />
                          </button>
                          <button className="btn-action-icon reject" title="Decline booking">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button className="btn-table-action">Manage</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer-note">
          <span>Reservation management routing structure ready for API connectivity.</span>
        </div>
      </div>
    </div>
  );
};
