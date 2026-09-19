import React from 'react';
import { Tag, Plus, Percent, Sparkles, CheckCircle2 } from 'lucide-react';
import { offers } from '../../data/mockData';

export const AdminOffersPage = () => {
  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Promotions & Coupons</h1>
          <p className="admin-page-subtext">
            Configure discount codes, cashback offers, and minimum order rules.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('New coupon creation modal will be linked in Admin CRUD phase.')}>
          <Plus size={16} /> Create New Promo
        </button>
      </div>

      <div className="admin-offers-grid">
        {offers.map((offer) => (
          <div key={offer.id} className="admin-offer-card">
            <div className="admin-offer-header">
              <span className="offer-type-tag">
                <Percent size={14} /> Discount Code
              </span>
              <span className="admin-status-badge in-stock">Active</span>
            </div>
            <div className="admin-offer-code-box">
              <code>{offer.code}</code>
            </div>
            <h3 className="admin-offer-title">{offer.title}</h3>
            <p className="admin-offer-desc">{offer.description}</p>
            <div className="admin-offer-meta">
              <span>Min Order: <strong>₹{offer.minOrder}</strong></span>
              <span>Discount: <strong>{offer.discountPercent}%</strong></span>
            </div>
            <div className="admin-offer-footer">
              <button className="btn btn-sm btn-outline">Edit Rules</button>
              <button className="btn btn-sm btn-outline text-danger">Deactivate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
