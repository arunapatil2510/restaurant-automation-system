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
      error: error.message,
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
    const updatedOrder = await Order.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Order not found with identifier '${idOrNumber}'.`,
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


