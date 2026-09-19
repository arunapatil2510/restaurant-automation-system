import React from 'react';
import { UtensilsCrossed, Plus, Search, Filter } from 'lucide-react';
import { menuItems } from '../../data/mockData';

export const AdminMenuPage = () => {
  return (
    <div className="admin-page-container">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">Menu Management</h1>
          <p className="admin-page-subtext">
            Add dishes, edit prices, and manage real-time kitchen stock availability.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Add Dish Modal will be activated in the Admin CRUD phase.')}>
          <Plus size={16} /> Add New Dish
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-table-toolbar">
          <div className="admin-search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search menu dishes..." className="admin-input-small" readOnly value="" />
          </div>
          <span className="admin-count-tag">{menuItems.length} Total Dishes</span>
        </div>

        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Dish Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Dietary</th>
                <th>Status</th>
                <th>Prep Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.slice(0, 8).map((dish) => (
                <tr key={dish.id}>
                  <td>
                    <div className="admin-dish-cell">
                      <img src={dish.image} alt={dish.name} className="admin-dish-thumb" />
                      <div>
                        <strong>{dish.name}</strong>
                        {dish.isSpecial && <span className="dish-special-tag">Special</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-cat-pill">{dish.categorySlug}</span></td>
                  <td><strong>₹{dish.price}</strong></td>
                  <td>
                    <span className={`admin-type-badge ${dish.type}`}>
                      {dish.type === 'veg' ? '🥬 Veg' : '🍗 Non-Veg'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${dish.isAvailable !== false ? 'in-stock' : 'sold-out'}`}>
                      {dish.isAvailable !== false ? '● In Stock' : '✕ Sold Out'}
                    </span>
                  </td>
                  <td>{dish.prepTime || '15 min'}</td>
                  <td>
                    <div className="admin-actions-cell">
                      <button className="btn-table-action" onClick={() => alert('Full CRUD actions will be wired to backend in the Admin phase.')}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer-note">
          <span>Showing 8 of {menuItems.length} dishes in preview mode. Full CRUD will connect to MongoDB APIs.</span>
        </div>
      </div>
    </div>
  );
};
