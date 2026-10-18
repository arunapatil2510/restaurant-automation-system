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

// Middleware to protect admin routes
const authenticateAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const secretKey = process.env.ADMIN_SECRET_KEY;

  if (!adminKey || adminKey !== secretKey) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Unauthorized access. Invalid or missing admin key.',
    });
  }
  next();
};

// Helper to query order by either MongoDB ObjectId or human-readable orderNumber
const buildOrderQuery = (idOrNumber) => {
  const clean = (idOrNumber || '').trim();
  if (clean.match(/^[0-9a-fA-F]{24}$/)) {
    return { _id: clean };
  }
  return { orderNumber: clean.toUpperCase() };
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
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item data provided in the cart.',
        });
      }

      if (typeof item.menuItemId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(item.menuItemId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid menuItemId format.',
        });
      }

      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be an integer between 1 and 50.',
        });
      }

      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found.',
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

    if (appliedCoupon !== undefined && appliedCoupon !== null && appliedCoupon !== '') {
      if (typeof appliedCoupon !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Coupon code must be a string.',
        });
      }

      const cleanCoupon = appliedCoupon.trim().toUpperCase();
      if (cleanCoupon.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code cannot be empty.',
        });
      }

      const offer = await Offer.findOne({
        code: cleanCoupon,
        isActive: true,
      });

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Coupon code is invalid or expired.',
        });
      }

      if (offer.validUntil && new Date() > new Date(offer.validUntil)) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code has expired.',
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

    // 7. Return success response (includes both data and order for complete frontend compatibility)
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: newOrder,
      order: newOrder,
    });

  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
    });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Fetch all orders with optional status, tableNumber, and limit filters
 * @access  Private (Admin)
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, tableNumber, limit } = req.query;
    const filter = {};

    // 1. Status Filter Validation
    if (status && status !== 'all') {
      const validStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
      const cleanStatus = status.toLowerCase().trim();
      if (!validStatuses.includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid status filter. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      filter.orderStatus = cleanStatus;
    }

    // 2. Table Number Filter Validation
    if (tableNumber !== undefined && tableNumber !== '') {
      const parsedTable = parseInt(tableNumber, 10);
      if (isNaN(parsedTable) || parsedTable < 1) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'tableNumber must be a valid positive integer.',
        });
      }
      filter.tableNumber = parsedTable;
    }

    // 3. Limit Validation (default: 50, maximum: 100)
    let parsedLimit = 50;
    if (limit !== undefined && limit !== '') {
      const requestedLimit = parseInt(limit, 10);
      if (isNaN(requestedLimit) || requestedLimit < 1) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'limit must be a positive integer.',
        });
      }
      parsedLimit = Math.min(requestedLimit, 100);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching orders',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/orders/:idOrNumber
 * @desc    Fetch single order details for customer tracking (omits private phone info)
 * @access  Public
 */
router.get('/:idOrNumber', async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const query = buildOrderQuery(idOrNumber);

    // Omit sensitive customer phone number for public tracking
    const order = await Order.findOne(query).select('-phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Order not found with identifier '${idOrNumber}'.`,
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(`Error fetching order ${req.params.idOrNumber}:`, error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching order details',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/orders/:idOrNumber/status
 * @desc    Update order status and/or payment status (Admin/Staff)
 * @access  Private (Admin)
 */
router.patch('/:idOrNumber/status', authenticateAdmin, async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const { orderStatus, paymentStatus } = req.body || {};

    const validOrderStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid'];

    const updates = {};

    // Validate orderStatus if provided
    if (orderStatus !== undefined) {
      const cleanOrderStatus = typeof orderStatus === 'string' ? orderStatus.toLowerCase().trim() : '';
      if (!validOrderStatuses.includes(cleanOrderStatus)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid orderStatus provided. Allowed values: ${validOrderStatuses.join(', ')}`,
        });
      }
      updates.orderStatus = cleanOrderStatus;
    }

    // Validate paymentStatus if provided
    if (paymentStatus !== undefined) {
      const cleanPaymentStatus = typeof paymentStatus === 'string' ? paymentStatus.toLowerCase().trim() : '';
      if (!validPaymentStatuses.includes(cleanPaymentStatus)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid paymentStatus provided. Allowed values: ${validPaymentStatuses.join(', ')}`,
        });
      }
      updates.paymentStatus = cleanPaymentStatus;
    }

    // At least one valid field is required
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'At least one valid status field (orderStatus or paymentStatus) is required.',
      });
    }

    const query = buildOrderQuery(idOrNumber);
    const existingOrder = await Order.findOne(query);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Order not found with identifier '${idOrNumber}'.`,
      });
    }

    // Atomic CAS query filter
    const updateQuery = { ...query };

    // Validate status transition if orderStatus is being updated
    if (updates.orderStatus) {
      const currentStatus = existingOrder.orderStatus;
      const targetStatus = updates.orderStatus;

      if (currentStatus === targetStatus) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Order is already in '${targetStatus}' status.`,
        });
      }

      const allowedTransitions = Order.ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid order status transition from '${currentStatus}' to '${targetStatus}'.`,
        });
      }

      // Add condition for atomic compare-and-swap
      updateQuery.orderStatus = currentStatus;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      updateQuery,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'Order status was modified by another request concurrently. Please refresh and try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(`Error updating status for order ${req.params.idOrNumber}:`, error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating order status',
      error: error.message,
    });
  }
});

module.exports = router;


