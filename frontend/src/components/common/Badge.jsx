import React from 'react';

export const VegBadge = ({ type = 'veg' }) => {
  const isVeg = type === 'veg';
  return (
    <span
      className={`dietary-badge ${isVeg ? 'dietary-veg' : 'dietary-nonveg'}`}
      title={isVeg ? 'Vegetarian Dish' : 'Non-Vegetarian Dish'}
    >
      <span className="dietary-dot" />
    </span>
  );
};

export const SpecialBadge = ({ text = "Chef's Special" }) => (
  <span className="badge badge-special">
    <span>⭐</span> {text}
  </span>
);

export const StockBadge = ({ isAvailable = true }) => {
  if (isAvailable) {
    return <span className="badge badge-available">● In Stock</span>;
  }
  return <span className="badge badge-sold-out">✕ Sold Out</span>;
};

export const RatingBadge = ({ rating = 4.5 }) => (
  <span className="badge badge-rating">
    <span>★</span> {rating.toFixed(1)}
  </span>
);
