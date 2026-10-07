const mongoose = require('mongoose');

const KitchenOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  items: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
    default: [],
  },
  status: {
    type: String,
    enum: ['Pending', 'Preparing', 'Ready', 'Completed'],
    default: 'Pending',
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('KitchenOrder', KitchenOrderSchema);