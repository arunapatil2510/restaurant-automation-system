const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Middleware to protect kitchen/admin routes
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

// Map DB status to Frontend expected status
const mapStatusToFrontend = (dbStatus) => {
  const statusMap = {
    'new': 'Pending',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return statusMap[dbStatus] || dbStatus;
};

// Map Frontend status to DB expected status
const mapStatusToDB = (frontendStatus) => {
  const statusMap = {
    'Pending': 'new',
    'Preparing': 'preparing',
    'Ready': 'ready',
    'Completed': 'completed',
    'Cancelled': 'cancelled'
  };
  return statusMap[frontendStatus] || frontendStatus;
};

// Apply authentication middleware to all kitchen routes
router.use(authenticateAdmin);

/**
 * @route   GET /api/kitchen/orders/active
 * @desc    Fetch active orders for the kitchen (not completed or cancelled)
 * @access  Private (Admin)
 */
router.get('/orders/active', async (req, res) => {
  try {
    const activeOrders = await Order.find({
      orderStatus: { $in: ['new', 'preparing', 'ready'] }
    }).sort({ createdAt: 1 }); // Oldest first

    const data = activeOrders.map(order => ({
      orderId: order.orderNumber,
      status: mapStatusToFrontend(order.orderStatus),
      timestamp: order.createdAt,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    }));

    res.status(200).json({
      success: true,
      message: 'Active kitchen orders fetched successfully',
      data: data
    });
  } catch (error) {
    console.error('Error fetching active kitchen orders:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching kitchen orders',
    });
  }
});

/**
 * @route   PATCH /api/kitchen/orders/:id/status
 * @desc    Update order status from the kitchen
 * @access  Private (Admin)
 */
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const orderNumber = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Status is required.',
      });
    }

    const validFrontendStatuses = ['Pending', 'Preparing', 'Ready', 'Completed'];
    if (!validFrontendStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid status provided. Must be one of: ${validFrontendStatuses.join(', ')}`,
      });
    }

    const dbStatus = mapStatusToDB(status);

    const updatedOrder = await Order.findOneAndUpdate(
      { orderNumber: orderNumber },
      { orderStatus: dbStatus },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Order not found with ID: ${orderNumber}`,
      });
    }

    const formattedOrder = {
      orderId: updatedOrder.orderNumber,
      status: mapStatusToFrontend(updatedOrder.orderStatus),
      timestamp: updatedOrder.createdAt,
      items: updatedOrder.items.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    };

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: formattedOrder
    });
  } catch (error) {
    console.error('Error updating kitchen order status:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating order status',
    });
  }
});

module.exports = router;
