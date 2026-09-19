import React from 'react';
import { Plus, Minus, Clock, Star, Info } from 'lucide-react';
import { VegBadge, SpecialBadge, StockBadge } from '../common/Badge';
import { useCart } from '../../context/CartContext';

export const FoodCard = ({ dish, onOpenDetails }) => {
  const { getItemQuantity, addItem, updateQuantity } = useCart();
  const quantity = getItemQuantity(dish.id);
  const isAvailable = dish.isAvailable !== false;

  return (
    <article className={`food-card ${!isAvailable ? 'sold-out' : ''}`}>
      {/* Image Container with Badges */}
      <div className="food-card-img-wrapper" onClick={() => onOpenDetails && onOpenDetails(dish)}>
        <img
          src={dish.image}
          alt={dish.name}
          className="food-card-img"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="food-card-badges-top">
          <VegBadge type={dish.type} />
          {dish.isSpecial && <SpecialBadge text="Special" />}
        </div>

        {/* Rating overlay */}
        {dish.rating && (
          <div className="food-card-rating-badge">
            <Star size={12} fill="#ffb703" color="#ffb703" />
            <span>{dish.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Sold out overlay */}
        {!isAvailable && (
          <div className="sold-out-overlay">
            <span>Sold Out</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="food-card-content">
        <div className="food-card-header" onClick={() => onOpenDetails && onOpenDetails(dish)}>
          <h3 className="food-card-title">{dish.name}</h3>
          <button className="info-icon-btn" title="View ingredients & details" aria-label="View dish details">
            <Info size={15} />
          </button>
        </div>

        <p className="food-card-description">
          {dish.description}
        </p>

        {/* Meta: Prep Time & Dietary Tag */}
        <div className="food-card-meta">
          <span className="prep-time-pill">
            <Clock size={12} />
            <span>{dish.prepTime || '15 min'}</span>
          </span>
          {dish.dietaryTags && dish.dietaryTags.includes('jain-option') && (
            <span className="dietary-tag-pill">Jain Available</span>
          )}
        </div>

        {/* Footer: Price & Quantity Controls */}
        <div className="food-card-footer">
          <div className="food-card-price">
            <span className="currency-symbol">₹</span>
            <span className="price-value">{dish.price}</span>
          </div>

          <div className="food-card-action">
            {!isAvailable ? (
              <span className="sold-out-tag">Unavailable</span>
            ) : quantity === 0 ? (
              <button
                className="btn-add-food"
                onClick={() => addItem(dish, 1)}
                aria-label={`Add ${dish.name} to cart`}
              >
                <Plus size={15} /> Add
              </button>
            ) : (
              <div className="quantity-counter-box">
                <button
                  className="qty-btn qty-minus"
                  onClick={() => updateQuantity(dish.id, quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="qty-number">{quantity}</span>
                <button
                  className="qty-btn qty-plus"
                  onClick={() => updateQuantity(dish.id, quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
