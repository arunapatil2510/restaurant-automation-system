import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { VegBadge } from '../common/Badge';

export const CartItemRow = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="cart-item-card">
      <div className="cart-item-img-box">
        <img src={item.image} alt={item.name} className="cart-item-thumb" />
      </div>

      <div className="cart-item-info">
        <div className="cart-item-title-row">
          <VegBadge type={item.type} />
          <h4 className="cart-item-name">{item.name}</h4>
        </div>
        <div className="cart-item-unit-price">
          ₹{item.price} each
        </div>
      </div>

      {/* Quantity Stepper */}
      <div className="cart-item-actions">
        <div className="quantity-counter-box small">
          <button
            className="qty-btn"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus size={13} />
          </button>
          <span className="qty-number">{item.quantity}</span>
          <button
            className="qty-btn"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="cart-item-total">
          ₹{item.price * item.quantity}
        </div>

        <button
          className="cart-item-delete-btn"
          onClick={() => onRemove(item.id)}
          title="Remove item from cart"
          aria-label="Remove item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
