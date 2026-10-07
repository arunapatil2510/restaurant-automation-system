const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    type: {
      type: String,
      enum: ['veg', 'nonveg', 'egg'],
      default: 'veg',
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tableNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    customerName: {
      type: String,
      default: 'Dine-in Guest',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [val => val.length > 0, 'Order must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    appliedCoupon: {
      type: String,
      default: '',
      uppercase: true,
    },
    tax: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi_demo', 'card_demo', 'upi', 'card', 'pay_at_counter'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'paid',
    },
    orderStatus: {
      type: String,
      enum: ['new', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'new',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', OrderSchema);
