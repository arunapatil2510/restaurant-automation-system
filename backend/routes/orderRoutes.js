const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const KitchenOrder = require('../models/KitchenOrder');

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
    // Create corresponding kitchen order
    const kitchenOrder = new KitchenOrder({
      orderId: savedOrder.orderNumber,
      items: savedOrder.items,
      status: 'Pending',
    });

    await kitchenOrder.save();

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

// Mapping from Order status to KitchenOrder status
const ORDER_TO_KITCHEN_STATUS = {
  new: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Allowed forward transitions from Live Orders dashboard
const ALLOWED_ORDER_TRANSITIONS = {
  new: ['preparing', 'ready', 'completed', 'cancelled'],
  preparing: ['ready', 'completed', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [], // Terminal status
  cancelled: [], // Terminal status
};

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (new, preparing, ready, completed, cancelled) and sync with KitchenOrder
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

    const cleanId = id?.trim();
    let existingOrder = null;
    if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      existingOrder = await Order.findById(cleanId);
    }
    if (!existingOrder) {
      existingOrder = await Order.findOne({ orderNumber: cleanId.toUpperCase() });
    }

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: `Order not found with identifier '${id}'.`,
      });
    }

    // 1. Payment-only update: preserve order status and do not touch KitchenOrder
    if (!orderStatus) {
      if (paymentStatus) {
        existingOrder.paymentStatus = paymentStatus.toLowerCase();
        await existingOrder.save();
      }
      return res.status(200).json({
        success: true,
        message: `Order #${existingOrder.orderNumber} payment status updated to '${existingOrder.paymentStatus}'.`,
        data: existingOrder,
      });
    }

    const targetStatus = orderStatus.toLowerCase();
    const previousOrderStatus = existingOrder.orderStatus;

    // 2. Fetch matching KitchenOrder (if one exists)
    const kitchenOrder = await KitchenOrder.findOne({ orderId: existingOrder.orderNumber });

    // 3. Prevent reopening cancelled orders
    if (previousOrderStatus === 'cancelled' && targetStatus !== 'cancelled') {
      return res.status(409).json({
        success: false,
        message: `Order #${existingOrder.orderNumber} is cancelled and cannot be reopened to '${targetStatus}'.`,
      });
    }

    // 4. Prevent reopening completed orders
    if (previousOrderStatus === 'completed' && targetStatus !== 'completed') {
      return res.status(409).json({
        success: false,
        message: `Order #${existingOrder.orderNumber} is completed and cannot be transitioned to '${targetStatus}'.`,
      });
    }

    // 5. Prevent cancelling if main Order OR KitchenOrder is already Completed
    if (targetStatus === 'cancelled') {
      if (previousOrderStatus === 'completed') {
        return res.status(409).json({
          success: false,
          message: `Cannot cancel Order #${existingOrder.orderNumber} because it is already completed.`,
        });
      }
      if (kitchenOrder && kitchenOrder.status === 'Completed') {
        return res.status(409).json({
          success: false,
          message: `Cannot cancel Order #${existingOrder.orderNumber} because its kitchen preparation is already Completed.`,
        });
      }
    }

    // 6. Idempotent repeated cancellation or repeated status update
    if (previousOrderStatus === targetStatus) {
      if (paymentStatus) {
        existingOrder.paymentStatus = paymentStatus.toLowerCase();
        await existingOrder.save();
      }

      // Reconcile KitchenOrder if target is cancelled and kitchen ticket is not yet Cancelled (never overwrite Completed)
      if (targetStatus === 'cancelled' && kitchenOrder) {
        if (kitchenOrder.status === 'Completed') {
          return res.status(409).json({
            success: false,
            message: `Cannot reconcile Order #${existingOrder.orderNumber}: Kitchen ticket is already Completed.`,
          });
        }
        if (kitchenOrder.status !== 'Cancelled') {
          await KitchenOrder.findOneAndUpdate(
            { orderId: existingOrder.orderNumber, status: kitchenOrder.status },
            { $set: { status: 'Cancelled' } }
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Order #${existingOrder.orderNumber} is already in status '${targetStatus}'.`,
        data: existingOrder,
      });
    }

    // 7. Validate that current Order and KitchenOrder agree before ordinary transitions
    if (targetStatus !== 'cancelled' && kitchenOrder) {
      const expectedKitchenStatus = ORDER_TO_KITCHEN_STATUS[previousOrderStatus];
      if (kitchenOrder.status !== expectedKitchenStatus) {
        return res.status(409).json({
          success: false,
          message: `Status inconsistency detected: Order #${existingOrder.orderNumber} is '${previousOrderStatus}' but KitchenOrder is '${kitchenOrder.status}' (expected '${expectedKitchenStatus}').`,
        });
      }
    }

    // 8. Enforce forward-only status transitions
    const validTransitions = ALLOWED_ORDER_TRANSITIONS[previousOrderStatus] || [];
    if (!validTransitions.includes(targetStatus)) {
      return res.status(409).json({
        success: false,
        message: `Invalid status transition: Cannot change Order #${existingOrder.orderNumber} from '${previousOrderStatus}' to '${targetStatus}'.`,
      });
    }

    const previousKitchenStatus = kitchenOrder ? kitchenOrder.status : null;
    const targetKitchenStatus = ORDER_TO_KITCHEN_STATUS[targetStatus];

    const updateFields = { orderStatus: targetStatus };
    if (paymentStatus) {
      updateFields.paymentStatus = paymentStatus.toLowerCase();
    }

    // 9. Atomically update Order with optimistic concurrency guard
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        orderStatus: previousOrderStatus,
      },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        message: `Order #${existingOrder.orderNumber} was modified concurrently. Please refresh and retry.`,
      });
    }

    // 10. Conditionally update KitchenOrder if it exists (do NOT create one if missing)
    if (kitchenOrder) {
      let updatedKitchenOrder = null;
      try {
        updatedKitchenOrder = await KitchenOrder.findOneAndUpdate(
          {
            orderId: existingOrder.orderNumber,
            status: previousKitchenStatus,
          },
          { $set: { status: targetKitchenStatus } },
          { new: true, runValidators: true }
        );

        if (!updatedKitchenOrder) {
          // KitchenOrder was modified concurrently by another request
          // Compensating rollback on Order
          const rollbackResult = await Order.findOneAndUpdate(
            { _id: updatedOrder._id, orderStatus: targetStatus },
            { $set: { orderStatus: previousOrderStatus } }
          );

          if (!rollbackResult) {
            console.error(`[SYNC_RECONCILIATION_ALERT] Rollback failed: Order #${updatedOrder.orderNumber} status was altered concurrently during conflict resolution.`);
          }

          return res.status(409).json({
            success: false,
            message: `Kitchen order for #${existingOrder.orderNumber} was modified concurrently. Order update was rolled back.`,
          });
        }
      } catch (kitchenErr) {
        console.error(`[SYNC_ERROR] Failed to update KitchenOrder for #${existingOrder.orderNumber}:`, kitchenErr.message);
        // Compensating rollback on Order
        try {
          const rollbackResult = await Order.findOneAndUpdate(
            { _id: updatedOrder._id, orderStatus: targetStatus },
            { $set: { orderStatus: previousOrderStatus } }
          );

          if (!rollbackResult) {
            console.error(`[SYNC_RECONCILIATION_ALERT] Rollback failed: Order #${updatedOrder.orderNumber} status was altered concurrently after KitchenOrder error.`);
          }
        } catch (rollbackErr) {
          console.error(`[SYNC_RECONCILIATION_ALERT] Rollback threw error for Order #${updatedOrder.orderNumber}:`, rollbackErr.message);
        }

        throw kitchenErr;
      }
    } else {
      console.warn(`[Order Status Sync] No KitchenOrder found for Order #${existingOrder.orderNumber}. Skipping kitchen synchronization.`);
    }

    // 11. Return updated Order maintaining API response contract
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
