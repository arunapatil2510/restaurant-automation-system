const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');

// Helper to generate a unique order number
const generateOrderNumber = () => {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestampPart}${randomPart}`;
};

/**
 * @route   POST /api/orders
 * @desc    Create a new order from the cart
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { tableNumber, items, appliedCoupon, paymentMethod, notes } = req.body;

    // 1. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    let subtotal = 0;
    const orderItems = [];

    // 2. Process and validate each item securely from the database
    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item data provided in the cart.',
        });
      }

      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item not found with ID: ${item.menuItemId}`,
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `'${menuItem.name}' is currently unavailable.`,
        });
      }

      // Calculate price securely on the backend
      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price, // Store the historical price at the time of order
        quantity: item.quantity,
        type: menuItem.type,
      });
    }

    // 3. Process Coupon & Discount securely from the database
    let discount = 0;
    let validatedCoupon = '';

    if (appliedCoupon) {
      const offer = await Offer.findOne({
        code: appliedCoupon.toUpperCase().trim(),
        isActive: true,
      });

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: `Coupon code '${appliedCoupon}' is invalid or expired.`,
        });
      }

      if (subtotal < offer.minOrderValue) {
        return res.status(400).json({
          success: false,
          message: `Minimum order value of ₹${offer.minOrderValue} is required to apply this coupon.`,
        });
      }

      // Calculate discount amount based on offer type
      if (offer.discountType === 'percentage') {
        discount = (subtotal * offer.discountValue) / 100;
        if (offer.maxDiscount && discount > offer.maxDiscount) {
          discount = offer.maxDiscount;
        }
      } else if (offer.discountType === 'flat') {
        discount = offer.discountValue;
      }

      // Ensure discount doesn't exceed subtotal
      discount = Math.min(discount, subtotal);
      validatedCoupon = offer.code;
    }

    // 4. Calculate Tax and Final Total Amount
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.05); // 5% GST calculation
    const totalAmount = taxableAmount + tax;

    // 5. Generate Order Number
    const orderNumber = generateOrderNumber();

    // 6. Create the Order in MongoDB
    const newOrder = new Order({
      orderNumber,
      tableNumber: tableNumber || 1,
      items: orderItems,
      subtotal,
      discount,
      appliedCoupon: validatedCoupon,
      tax,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'paid', // Default to paid as per demo
      orderStatus: 'new', // Default status for kitchen
      notes: notes || '',
    });

    await newOrder.save();

    // 7. Return success response
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder,
    });

  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message,
    });
  }
});

module.exports = router;

