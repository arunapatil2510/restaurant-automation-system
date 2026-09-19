const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Offer code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Offer title is required'],
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount cannot be negative'],
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
      default: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Offer', OfferSchema);
