const express = require('express');
const KitchenOrder = require('../models/KitchenOrder');
const Order = require('../models/Order');

const router = express.Router();
const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Completed'];

// Forward-only status transition state machine for KDS
const ALLOWED_TRANSITIONS = {
  Pending: ['Preparing'],
  Preparing: ['Ready'],
  Ready: ['Completed'],
  Completed: [], // Terminal status: completed orders cannot be transitioned further
};

// Status mapping between KitchenOrder and main Order
const KITCHEN_TO_ORDER_STATUS = {
  Pending: 'new',
  Preparing: 'preparing',
  Ready: 'ready',
  Completed: 'completed',
};

/**
 * @route   GET /api/kitchen/orders/active
 * @desc    Fetch active kitchen orders (excludes Completed and Cancelled tickets)
 * @access  Kitchen / Staff
 */
router.get('/active', async (req, res) => {
  try {
    const orders = await KitchenOrder.find({ status: { $in: ['Pending', 'Preparing', 'Ready'] } })
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active kitchen orders',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/kitchen/orders/:orderId/status
 * @desc    Advance kitchen order status and synchronize with main Order document
 * @access  Kitchen / Staff
 */
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const cleanOrderId = req.params.orderId?.trim();

    // 1. Validate status input
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    // 2. Pre-validate KitchenOrder existence
    const kitchenOrder = await KitchenOrder.findOne({ orderId: cleanOrderId });
    if (!kitchenOrder) {
      return res.status(404).json({
        success: false,
        message: `Kitchen order '${cleanOrderId}' was not found`,
      });
    }

    // 3. Pre-validate main Order existence
    const mainOrder = await Order.findOne({ orderNumber: cleanOrderId });
    if (!mainOrder) {
      return res.status(404).json({
        success: false,
        message: `Matching main order '${cleanOrderId}' was not found. Kitchen order status was not modified.`,
      });
    }

    // 4. Guard against cancelled main orders or cancelled kitchen tickets
    if (mainOrder.orderStatus === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: `Cannot update kitchen order '${cleanOrderId}' because the main order has already been cancelled.`,
      });
    }

    if (kitchenOrder.status === 'Cancelled') {
      return res.status(409).json({
        success: false,
        message: `Kitchen order '${cleanOrderId}' is cancelled and cannot be updated.`,
      });
    }

    const mappedOrderStatus = KITCHEN_TO_ORDER_STATUS[status];

    // 5. Prevent reopening completed kitchen orders
    if (kitchenOrder.status === 'Completed') {
      if (status === 'Completed' && mainOrder.orderStatus === 'completed') {
        return res.status(200).json({
          success: true,
          data: kitchenOrder,
        });
      }
      if (status === 'Completed' && mainOrder.orderStatus !== 'completed') {
        return res.status(409).json({
          success: false,
          message: `Status inconsistency detected: Kitchen order '${cleanOrderId}' is 'Completed' but main order is '${mainOrder.orderStatus}'. Please verify order status in Live Orders.`,
        });
      }
      return res.status(409).json({
        success: false,
        message: `Kitchen order '${cleanOrderId}' is already completed and cannot be reopened.`,
      });
    }

    // 6. Handle repeated requests: verify both collections are consistent
    if (kitchenOrder.status === status) {
      if (mainOrder.orderStatus === mappedOrderStatus) {
        return res.status(200).json({
          success: true,
          data: kitchenOrder,
        });
      }
      return res.status(409).json({
        success: false,
        message: `Status inconsistency detected: Kitchen order '${cleanOrderId}' is already '${status}' but main order is '${mainOrder.orderStatus}'.`,
      });
    }

    // 7. Enforce forward-only status transitions
    const validNextSteps = ALLOWED_TRANSITIONS[kitchenOrder.status] || [];
    if (!validNextSteps.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${kitchenOrder.status}' to '${status}'. Allowed next step: ${validNextSteps.join(', ') || 'None'}`,
      });
    }

    // 8. Guard against modifying an already completed main order
    if (mainOrder.orderStatus === 'completed') {
      return res.status(409).json({
        success: false,
        message: `Main order '${cleanOrderId}' is already completed and cannot be modified.`,
      });
    }

    // 9. Verify main Order.orderStatus equals expected mapped status of KitchenOrder's current status
    const expectedCurrentOrderStatus = KITCHEN_TO_ORDER_STATUS[kitchenOrder.status];
    if (mainOrder.orderStatus !== expectedCurrentOrderStatus) {
      return res.status(409).json({
        success: false,
        message: `Status inconsistency detected: Kitchen order '${cleanOrderId}' is '${kitchenOrder.status}' which requires main order status to be '${expectedCurrentOrderStatus}', but found '${mainOrder.orderStatus}'.`,
      });
    }

    const previousKitchenStatus = kitchenOrder.status;

    // 10. Atomically update main Order with concurrency guard on expected previous status
    const updatedOrder = await Order.findOneAndUpdate(
      {
        orderNumber: cleanOrderId,
        orderStatus: expectedCurrentOrderStatus,
      },
      { $set: { orderStatus: mappedOrderStatus } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        message: `Main order '${cleanOrderId}' was modified or cancelled concurrently. Kitchen order status was not modified.`,
      });
    }

    // 11. Conditionally update KitchenOrder checking expected previous status
    let updatedKitchenOrder = null;
    try {
      updatedKitchenOrder = await KitchenOrder.findOneAndUpdate(
        {
          orderId: cleanOrderId,
          status: previousKitchenStatus,
        },
        { $set: { status } },
        { new: true, runValidators: true }
      );

      if (!updatedKitchenOrder) {
        // Concurrently modified KitchenOrder: execute conditional rollback on Order
        const rollbackResult = await Order.findOneAndUpdate(
          {
            orderNumber: cleanOrderId,
            orderStatus: mappedOrderStatus,
          },
          { $set: { orderStatus: expectedCurrentOrderStatus } }
        );

        if (!rollbackResult) {
          console.warn(`[KDS Sync] Rollback skipped: Order '${cleanOrderId}' status was altered concurrently.`);
        }

        return res.status(409).json({
          success: false,
          message: `Kitchen order '${cleanOrderId}' was modified concurrently. Order update was rolled back.`,
        });
      }
    } catch (kitchenUpdateError) {
      // Execution error during KitchenOrder update: execute conditional rollback on Order
      console.error(`[KDS Sync Error] Failed to update KitchenOrder '${cleanOrderId}', executing conditional rollback:`, kitchenUpdateError.message);
      const rollbackResult = await Order.findOneAndUpdate(
        {
          orderNumber: cleanOrderId,
          orderStatus: mappedOrderStatus,
        },
        { $set: { orderStatus: expectedCurrentOrderStatus } }
      );

      if (!rollbackResult) {
        console.warn(`[KDS Sync] Rollback skipped: Order '${cleanOrderId}' status was altered concurrently.`);
      }

      throw kitchenUpdateError;
    }

    // 12. Return updated KitchenOrder maintaining API response contract
    res.status(200).json({
      success: true,
      data: updatedKitchenOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating kitchen order status',
      error: error.message,
    });
  }
});

module.exports = router;
