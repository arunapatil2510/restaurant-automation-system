const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dish name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Dish description is required'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
    },
    categorySlug: {
      type: String,
      required: [true, 'Category slug is required'],
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    type: {
      type: String,
      enum: ['veg', 'nonveg', 'egg'],
      default: 'veg',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isSpecial: {
      type: Boolean,
      default: false,
    },
    prepTime: {
      type: String,
      default: '15 min',
    },
    image: {
      type: String,
      default: '',
    },
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    dietaryTags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Text index for search
MenuItemSchema.index({ name: 'text', description: 'text', ingredients: 'text' });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
