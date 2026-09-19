const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');

/**
 * @route   GET /api/offers
 * @desc    Get all active promotional offers and coupon discounts
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const filter = {};

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const offers = await Offer.find(filter).sort({ discountValue: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    console.error('Error fetching offers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offers',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/offers/:code
 * @desc    Validate/lookup coupon code by code string (e.g., FLAT20)
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const offer = await Offer.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: `Coupon code '${code}' is invalid or expired.`,
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error(`Error validating coupon code ${req.params.code}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while validating coupon code',
      error: error.message,
    });
  }
});

module.exports = router;
