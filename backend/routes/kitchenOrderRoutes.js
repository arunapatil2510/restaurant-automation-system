const express = require('express');
const KitchenOrder = require('../models/KitchenOrder');

const router = express.Router();
const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Completed'];

router.get('/active', async (req, res) => {
  try {
    const orders = await KitchenOrder.find({ status: { $ne: 'Completed' } })
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

router.patch('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    const order = await KitchenOrder.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Kitchen order '${req.params.orderId}' was not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: order,
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