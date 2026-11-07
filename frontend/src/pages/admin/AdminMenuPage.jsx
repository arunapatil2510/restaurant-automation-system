
import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UtensilsCrossed,
  RefreshCw,
  ImagePlus,
} from 'lucide-react';

import {
  getMenuItems,
  getCategories,
  createMenuItem,
  updateMenuItem,
  updateMenuAvailability,
  deleteMenuItem,
} from '../../services/menuService';

import { Modal } from '../../components/common/Modal';

const emptyForm = {
  name: '',
  description: '',
  categoryId: '',
  price: '',
  type: 'veg',
  isAvailable: true,
  isSpecial: false,
  prepTime: '15 min',
  image: '',
};

export const AdminMenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Fetch menu items and categories
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [items, categoryData] = await Promise.all([
        getMenuItems(),
        getCategories(),
      ]);

      setMenuItems(items);
      setCategories(categoryData);
    } catch (err) {
      console.error('Menu loading error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to load menu. Please check your backend server.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Add Dish modal
  const openAddModal = () => {
    setEditingDish(null);

    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id || '',
    });

    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  // Open Edit Dish modal
  const openEditModal = (dish) => {
    setEditingDish(dish);

    const categoryId =
      typeof dish.categoryId === 'object'
        ? dish.categoryId?._id
        : dish.categoryId;

    setForm({
      name: dish.name || '',
      description: dish.description || '',
      categoryId: categoryId || '',
      price: dish.price ?? '',
      type: dish.type || 'veg',
      isAvailable: dish.isAvailable !== false,
      isSpecial: Boolean(dish.isSpecial),
      prepTime: dish.prepTime || '15 min',
      image: dish.image || '',
    });

    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  // Handle form inputs
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Add or update a dish
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const itemData = {
        ...form,
        price: Number(form.price),
      };

      if (editingDish) {
        await updateMenuItem(editingDish.id, itemData);
        setSuccess('Dish updated successfully!');
      } else {
        await createMenuItem(itemData);
        setSuccess('Dish added successfully!');
      }

      setModalOpen(false);
      setEditingDish(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      console.error('Saving menu item error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to save menu item. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle availability
  const handleAvailability = async (dish) => {
    try {
      setError('');
      setSuccess('');

      await updateMenuAvailability(
        dish.id,
        !dish.isAvailable
      );

      setSuccess(
        `${dish.name} is now ${dish.isAvailable ? 'unavailable' : 'available'
        }.`
      );

      await loadData();
    } catch (err) {
      console.error('Availability update error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to update availability.'
      );
    }
  };

  // Soft delete a dish
  const handleDelete = async (dish) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${dish.name}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      await deleteMenuItem(dish.id);

      setSuccess(`${dish.name} deleted successfully!`);

      await loadData();
    } catch (err) {
      console.error('Delete menu item error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to delete menu item.'
      );
    }
  };

  // Search menu items
  const filteredItems = menuItems.filter((dish) =>
    dish.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page-container">

      {/* Page Header */}
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-heading">
            Menu Management
          </h1>

          <p className="admin-page-subtext">
            Add dishes, edit prices, and manage kitchen stock availability.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openAddModal}
          disabled={categories.length === 0}
        >
          <Plus size={17} />
          Add New Dish
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          style={{
            color: '#b42318',
            background: '#fff1f0',
            border: '1px solid #ffcccc',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '15px',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            color: '#17652f',
            background: '#effaf0',
            border: '1px solid #ccebd0',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '15px',
          }}
        >
          {success}
        </div>
      )}

      {/* Menu Table */}
      <div className="admin-card">

        <div className="admin-table-toolbar">
          <div className="admin-search-box">
            <Search
              size={17}
              className="search-icon"
            />

            <input
              type="text"
              placeholder="Search menu dishes..."
              className="admin-input-small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="admin-count-tag">
              {menuItems.length} Total Dishes
            </span>

            <button
              className="btn-table-action"
              onClick={loadData}
              title="Refresh menu"
              disabled={loading}
            >
              <RefreshCw size={16} />
            </button>
          </div>
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
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '35px' }}>
                    Loading menu...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '35px' }}>
                    <UtensilsCrossed
                      size={28}
                      style={{ marginBottom: '8px', opacity: 0.5 }}
                    />
                    <div>No menu items found.</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((dish) => (
                  <tr key={dish.id}>

                    {/* Dish Name */}
                    <td>
                      <div className="admin-dish-cell">

                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="admin-dish-thumb"
                          />
                        ) : (
                          <div
                            className="admin-dish-thumb"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              background: '#edf5ed',
                            }}
                          >
                            <ImagePlus size={20} />
                          </div>
                        )}

                        <div>
                          <strong>{dish.name}</strong>

                          {dish.isSpecial && (
                            <span className="dish-special-tag">
                              Special
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="admin-cat-pill">
                        {dish.categorySlug ||
                          dish.categoryId?.slug ||
                          'Uncategorized'}
                      </span>
                    </td>

                    {/* Price */}
                    <td>
                      <strong>₹{dish.price}</strong>
                    </td>

                    {/* Dietary Type */}
                    <td>
                      <span className={`admin-type-badge ${dish.type}`}>
                        {dish.type === 'veg'
                          ? '🥬 Veg'
                          : dish.type === 'egg'
                            ? '🥚 Egg'
                            : '🍗 Non-Veg'}
                      </span>
                    </td>

                    {/* Availability */}
                    <td>
                      <button
                        type="button"
                        className={`admin-status-badge ${dish.isAvailable ? 'in-stock' : 'sold-out'
                          }`}
                        onClick={() => handleAvailability(dish)}
                        title="Click to change availability"
                      >
                        {dish.isAvailable
                          ? '● In Stock'
                          : '✕ Sold Out'}
                      </button>
                    </td>

                    {/* Preparation Time */}
                    <td>
                      {dish.prepTime || '15 min'}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="admin-actions-cell">

                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => openEditModal(dish)}
                          title="Edit dish"
                        >
                          <Edit size={15} />
                        </button>

                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => handleDelete(dish)}
                          title="Delete dish"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        <div className="admin-table-footer-note">
          <span>
            Showing {filteredItems.length} of {menuItems.length} dishes.
            Connected to the backend API.
          </span>
        </div>

      </div>

      {/* Add / Edit Dish Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDish ? 'Edit Dish' : 'Add New Dish'}
        maxWidth="760px"
      >
        <form
          onSubmit={handleSubmit}
          className="admin-dish-form"
        >

          {/* Dish Name */}
          <div className="form-group">
            <label className="form-label">
              Dish Name
            </label>

            <input
              className="form-input"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. Chocolate Lava Cake"
              required
              maxLength="100"
            />
          </div>

          {/* Price */}
          <div className="form-group">
            <label className="form-label">
              Price (₹)
            </label>

            <input
              className="form-input"
              type="number"
              name="price"
              value={form.price}
              onChange={handleFormChange}
              placeholder="Enter price"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              Description
            </label>

            <textarea
              className="form-input"
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Describe your delicious dish..."
              required
              maxLength="1000"
              rows="3"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">
              Category
            </label>

            <select
              className="form-input"
              name="categoryId"
              value={form.categoryId}
              onChange={handleFormChange}
              required
            >
              <option value="">
                Select Category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Food Type */}
          <div className="form-group">
            <label className="form-label">
              Food Type
            </label>

            <select
              className="form-input"
              name="type"
              value={form.type}
              onChange={handleFormChange}
            >
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-Vegetarian</option>
              <option value="egg">Contains Egg</option>
            </select>
          </div>

          {/* Preparation Time */}
          <div className="form-group">
            <label className="form-label">
              Preparation Time
            </label>

            <input
              className="form-input"
              name="prepTime"
              value={form.prepTime}
              onChange={handleFormChange}
              placeholder="e.g. 15 min"
              maxLength="50"
            />
          </div>

          {/* Image URL */}
          <div className="form-group">
            <label className="form-label">
              Image URL
            </label>

            <input
              className="form-input"
              name="image"
              value={form.image}
              onChange={handleFormChange}
              placeholder="Paste food image URL"
            />

            {form.image && (
              <img
                src={form.image}
                alt="Dish preview"
                style={{
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  marginTop: '8px',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={(e) => {
                  e.currentTarget.style.display = 'block';
                }}
              />
            )}
          </div>

          {/* Special */}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                name="isSpecial"
                checked={form.isSpecial}
                onChange={handleFormChange}
              />
              Mark as Special
            </label>
          </div>

          {/* Availability */}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                name="isAvailable"
                checked={form.isAvailable}
                onChange={handleFormChange}
              />
              Available for ordering
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingDish
                ? 'Update Dish'
                : 'Add Dish'}
          </button>

        </form>
      </Modal>

    </div>
  );
};
