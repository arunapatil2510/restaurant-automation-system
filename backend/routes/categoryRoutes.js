const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

/**
 * @route   GET /api/categories
 * @desc    Get all menu categories sorted by displayOrder
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message,
    });
  }
});

module.exports = router;
