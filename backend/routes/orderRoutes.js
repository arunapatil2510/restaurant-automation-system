const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');

// In-memory fallback store if MongoDB Atlas is not yet connected
const inMemoryOrders = [];

// Helper to check if MongoDB is active
const isDbConnected = () => mongoose.connection.readyState === 1;

// Helper to generate unique order number (e.g., ORD-739210)
const generateOrderNumber = () => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${randomSuffix}`;
};

/**
 * @route   POST /api/orders
 * @desc    Create / place a new customer order
 * @access  Public (Table customer)
 */
router.post('/', async (req, res) => {
  try {
    const {
      tableNumber,
      customerName,
      phone,
      items,
      subtotal,
      discount,
      appliedCoupon,
      tax,
      totalAmount,
      paymentMethod,
      paymentStatus,
      notes,
    } = req.body;

    // 1. Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    const table = parseInt(tableNumber, 10) || 1;
    if (table < 1 || table > 20) {
      return res.status(400).json({
        success: false,
        message: 'Table number must be between 1 and 20.',
      });
    }

    // 2. Sanitize and validate items
    const sanitizedItems = items.map((item) => {
      let menuItemId = item.menuItemId || item.id;
      // If menuItemId is not a valid ObjectId (e.g. mock "dish-1"), generate a surrogate ObjectId
      if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
        menuItemId = new mongoose.Types.ObjectId();
      }

      return {
        menuItemId,
        name: item.name || 'Unnamed Dish',
        price: Number(item.price) || 0,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        type: ['veg', 'nonveg', 'egg'].includes(item.type) ? item.type : 'veg',
      };
    });

    // 3. Recalculate / verify totals
    const calculatedSubtotal = sanitizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const orderDiscount = Math.max(0, Number(discount) || 0);
    const taxableAmount = Math.max(0, calculatedSubtotal - orderDiscount);
    const calculatedTax = Math.round(taxableAmount * 0.05); // 5% GST
    const calculatedTotal = taxableAmount + calculatedTax;

    const orderNumber = generateOrderNumber();

    const orderPayload = {
      orderNumber,
      tableNumber: table,
      customerName: (customerName && customerName.trim()) || 'Dine-in Guest',
      phone: (phone && phone.trim()) || '',
      items: sanitizedItems,
      subtotal: subtotal !== undefined ? Number(subtotal) : calculatedSubtotal,
      discount: orderDiscount,
      appliedCoupon: (appliedCoupon && appliedCoupon.trim().toUpperCase()) || '',
      tax: tax !== undefined ? Number(tax) : calculatedTax,
      totalAmount: totalAmount !== undefined ? Number(totalAmount) : calculatedTotal,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || (paymentMethod === 'cash' ? 'pending' : 'paid'),
      orderStatus: 'new',
      notes: (notes && notes.trim()) || '',
    };

    // 4. Save to MongoDB if connected, else fallback to in-memory store
    if (isDbConnected()) {
      const newOrder = await Order.create(orderPayload);
      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: newOrder,
      });
    } else {
      // In-memory fallback
      const mockOrder = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...orderPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryOrders.unshift(mockOrder);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully (saved to server session)',
        data: mockOrder,
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to place order. Server encountered an error.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details by MongoDB _id or orderNumber (e.g. ORD-1082)
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      let order = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
      }
      if (!order) {
        order = await Order.findOne({ orderNumber: id.toUpperCase().trim() });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: `Order '${id}' not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } else {
      // In-memory fallback lookup
      const order = inMemoryOrders.find(
        (o) => o._id === id || o.orderNumber === id.toUpperCase().trim()
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: `Order '${id}' not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    }
  } catch (error) {
    console.error(`Error fetching order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching order details.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get orders list with optional table or status filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { table, status, limit = 50 } = req.query;

    if (isDbConnected()) {
      const filter = {};
      if (table) filter.tableNumber = parseInt(table, 10);
      if (status) filter.orderStatus = status;

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10));

      return res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } else {
      let results = [...inMemoryOrders];
      if (table) results = results.filter((o) => o.tableNumber === parseInt(table, 10));
      if (status) results = results.filter((o) => o.orderStatus === status);

      return res.status(200).json({
        success: true,
        count: results.length,
        data: results.slice(0, parseInt(limit, 10)),
      });
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching orders.',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status or payment status
 * @access  Public (Staff / Admin / Kitchen)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const allowedOrderStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    const allowedPaymentStatuses = ['pending', 'paid'];

    const updates = {};
    if (orderStatus && allowedOrderStatuses.includes(orderStatus)) {
      updates.orderStatus = orderStatus;
    }
    if (paymentStatus && allowedPaymentStatuses.includes(paymentStatus)) {
      updates.paymentStatus = paymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid status fields provided for update.',
      });
    }

    if (isDbConnected()) {
      let order = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!order) {
        order = await Order.findOneAndUpdate(
          { orderNumber: id.toUpperCase().trim() },
          updates,
          { new: true }
        );
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: `Order '${id}' not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });
    } else {
      const orderIndex = inMemoryOrders.findIndex(
        (o) => o._id === id || o.orderNumber === id.toUpperCase().trim()
      );

      if (orderIndex === -1) {
        return res.status(404).json({
          success: false,
          message: `Order '${id}' not found.`,
        });
      }

      inMemoryOrders[orderIndex] = {
        ...inMemoryOrders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: inMemoryOrders[orderIndex],
      });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating order status.',
      error: error.message,
    });
  }
});

module.exports = router;
