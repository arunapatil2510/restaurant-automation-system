import React from 'react';
import { Modal } from '../common/Modal';
import { VegBadge, SpecialBadge, StockBadge } from '../common/Badge';
import { Clock, Star, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const DishDetailModal = ({ dish, isOpen, onClose }) => {
  const { getItemQuantity, addItem, updateQuantity } = useCart();

  if (!dish) return null;

  const quantity = getItemQuantity(dish.id);
  const isAvailable = dish.isAvailable !== false;

  const fallbackImage = dish.categorySlug === 'beverages'
    ? 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop'
    : dish.categorySlug === 'desserts'
    ? 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&h=400&fit=crop'
    : 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&h=400&fit=crop';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={dish.name} maxWidth="560px">
      <div className="dish-modal-container">
        {/* Large Cover Image */}
        <div className="dish-modal-img-box">
          <img 
            src={dish.image || fallbackImage} 
            alt={dish.name} 
            className="dish-modal-img" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackImage;
            }}
          />
          <div className="dish-modal-badges">
            <VegBadge type={dish.type} />
            {dish.isSpecial && <SpecialBadge text="Chef's Special" />}
            <StockBadge isAvailable={isAvailable} />
          </div>
        </div>

        {/* Title, Category & Price */}
        <div className="dish-modal-header-info">
          <div>
            <h2 className="dish-modal-name">{dish.name}</h2>
            <div className="dish-modal-meta-row">
              <span className="dish-modal-cat">{dish.categorySlug?.toUpperCase()}</span>
              {dish.rating && (
                <span className="dish-modal-rating">
                  <Star size={14} fill="#ffb703" color="#ffb703" />
                  <strong>{dish.rating.toFixed(1)}</strong> / 5.0
                </span>
              )}
              <span className="dish-modal-time">
                <Clock size={14} /> {dish.prepTime || '15 min'}
              </span>
            </div>
          </div>
          <div className="dish-modal-price">
            <span className="currency">₹</span>
            <span className="amount">{dish.price}</span>
          </div>
        </div>

        {/* Description */}
        <p className="dish-modal-desc">{dish.description}</p>

        {/* Ingredients Section */}
        {dish.ingredients && dish.ingredients.length > 0 && (
          <div className="dish-modal-section">
            <h4 className="section-subtitle">Ingredients & Recipe Highlights</h4>
            <div className="tag-chips-grid">
              {dish.ingredients.map((ing, idx) => (
                <span key={idx} className="ingredient-chip">
                  <Check size={12} className="chip-check-icon" /> {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dietary & Allergy Tags */}
        {dish.dietaryTags && dish.dietaryTags.length > 0 && (
          <div className="dish-modal-section">
            <h4 className="section-subtitle">Dietary & Allergen Information</h4>
            <div className="tag-chips-grid">
              {dish.dietaryTags.map((tag, idx) => (
                <span key={idx} className="dietary-chip">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="dish-modal-footer">
          {!isAvailable ? (
            <div className="dish-modal-sold-out-alert">
              This item is currently out of stock in the kitchen.
            </div>
          ) : quantity === 0 ? (
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => {
                addItem(dish, 1);
                onClose();
              }}
            >
              <ShoppingBag size={18} /> Add to Cart • ₹{dish.price}
            </button>
          ) : (
            <div className="dish-modal-qty-row">
              <div className="modal-quantity-controls">
                <button
                  className="qty-btn qty-minus"
                  onClick={() => updateQuantity(dish.id, quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="qty-number-large">{quantity}</span>
                <button
                  className="qty-btn qty-plus"
                  onClick={() => updateQuantity(dish.id, quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Done (Total: ₹{dish.price * quantity})
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
