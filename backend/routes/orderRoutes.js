const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

/**
 * @route   POST /api/orders
 * @desc    Create a new dine-in restaurant order
 * @access  Public (Customer)
 */
router.post('/', async (req, res) => {
  try {
    const {
      tableNumber,
      customerName,
      phone,
      items,
      subtotal,
      discount = 0,
      appliedCoupon = '',
      tax = 0,
      totalAmount,
      paymentMethod = 'cash',
      paymentStatus,
      notes = '',
    } = req.body;

    // Validation
    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required to place an order.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    // Generate unique order number (e.g., ORD-782914)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${randomSuffix}`;

    // Structure and validate ordered items
    const formattedItems = items.map((item) => {
      const rawId = item.menuItemId || item.id || item._id;
      const isValidObjectId = rawId && typeof rawId === 'string' && rawId.match(/^[0-9a-fA-F]{24}$/);
      return {
        menuItemId: isValidObjectId ? new mongoose.Types.ObjectId(rawId) : undefined,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        type: item.type || 'veg',
      };
    });

    // Calculate totals
    const calcSubtotal = subtotal !== undefined
      ? Number(subtotal)
      : formattedItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    const calcTax = tax !== undefined ? Number(tax) : Math.round(calcSubtotal * 0.05);
    const calcDiscount = Number(discount) || 0;
    const calcTotal = totalAmount !== undefined
      ? Number(totalAmount)
      : Math.max(0, calcSubtotal - calcDiscount + calcTax);

    // Set payment status based on method
    const finalPaymentStatus = paymentStatus || (paymentMethod === 'cash' || paymentMethod === 'pay_at_counter' ? 'pending' : 'paid');

    const newOrder = new Order({
      orderNumber,
      tableNumber: Number(tableNumber),
      customerName: customerName?.trim() || `Table #${tableNumber} Guest`,
      phone: phone?.trim() || '',
      items: formattedItems,
      subtotal: calcSubtotal,
      discount: calcDiscount,
      appliedCoupon: appliedCoupon?.trim().toUpperCase() || '',
      tax: calcTax,
      totalAmount: calcTotal,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      orderStatus: 'new',
      notes: notes?.trim() || '',
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: `Order #${orderNumber} placed successfully!`,
      data: savedOrder,
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
 * @desc    Get all orders with optional status and table filters
 * @access  Public / Staff
 */
router.get('/', async (req, res) => {
  try {
    const { status, tableNumber, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.orderStatus = status.toLowerCase();
    }

    if (tableNumber) {
      filter.tableNumber = Number(tableNumber);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ObjectId or orderNumber
 * @access  Public / Staff
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }

    if (!order) {
      order = await Order.findOne({ orderNumber: id.toUpperCase().trim() });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with identifier '${id}'.`,
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(`Error fetching order ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order details',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (new, preparing, ready, completed, cancelled)
 * @access  Staff
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const allowedStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    if (orderStatus && !allowedStatuses.includes(orderStatus.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid orderStatus '${orderStatus}'. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }

    const updateFields = {};
    if (orderStatus) {
      updateFields.orderStatus = orderStatus.toLowerCase();
    }
    if (paymentStatus) {
      updateFields.paymentStatus = paymentStatus.toLowerCase();
    }

    let updatedOrder = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      updatedOrder = await Order.findByIdAndUpdate(id, updateFields, { new: true });
    }

    if (!updatedOrder) {
      updatedOrder = await Order.findOneAndUpdate(
        { orderNumber: id.toUpperCase().trim() },
        updateFields,
        { new: true }
      );
    }

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: `Order not found with identifier '${id}'.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} status updated to '${updatedOrder.orderStatus}'.`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error(`Error updating order status for ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
      error: error.message,
    });
  }
});

module.exports = router;
