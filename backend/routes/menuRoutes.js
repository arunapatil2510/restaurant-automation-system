const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

/**
 * @route   GET /api/menu
 * @desc    Get all menu items with optional category, type, search, and availability filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, type, search, isAvailable, isSpecial, sort } = req.query;
    const filter = {};

    // 1. Category Filter (by slug or ObjectId)
    if (category && category !== 'all') {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.categoryId = category;
      } else {
        filter.categorySlug = category.toLowerCase();
      }
    }

    // 2. Dietary Filter ('veg' | 'nonveg' | 'egg')
    if (type && type !== 'all') {
      filter.type = type.toLowerCase();
    }

    // 3. Availability Filter
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    // 4. Chef Special Filter
    if (isSpecial !== undefined) {
      filter.isSpecial = isSpecial === 'true';
    }

    // 5. Search Query Filter (name, description, ingredients)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { ingredients: { $in: [searchRegex] } },
        { dietaryTags: { $in: [searchRegex] } },
      ];
    }

    // 6. Sorting
    let sortOption = { name: 1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { isSpecial: -1, price: 1 };

    const menuItems = await MenuItem.find(filter)
      .populate('categoryId', 'name slug icon')
      .sort(sortOption);

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    console.error('Error fetching menu items:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching menu items',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/menu/:id
 * @desc    Get single menu item by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let item = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      item = await MenuItem.findById(id).populate('categoryId', 'name slug icon');
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item not found with ID ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error(`Error fetching menu item ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching menu item details',
      error: error.message,
    });
  }
});

// Middleware to protect admin menu routes
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

/**
 * @route   PATCH /api/menu/:id/availability
 * @desc    Update a menu item's availability (in-stock / sold-out)
 * @access  Private (Admin)
 */
router.patch('/:id/availability', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate MongoDB ObjectId format (return 400 for malformed IDs)
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid menu item ID format: '${id}'. Must be a 24-character hexadecimal ObjectId.`,
      });
    }

    // 2. Reject empty body or non-object
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body cannot be empty.',
      });
    }

    // 3. Reject unexpected / arbitrary fields
    const bodyKeys = Object.keys(req.body);
    const unpermittedKeys = bodyKeys.filter((k) => k !== 'isAvailable');
    if (unpermittedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Unpermitted field(s) in request body: ${unpermittedKeys.join(', ')}. Only 'isAvailable' is allowed.`,
      });
    }

    // 4. Validate that isAvailable is strictly a boolean
    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        data: null,
        message: "'isAvailable' is required and must be a boolean (true or false).",
      });
    }

    // 5. Update menu item in MongoDB
    const updatedItem = await MenuItem.findByIdAndUpdate(
      id,
      { $set: { isAvailable } },
      { new: true, runValidators: true }
    ).populate('categoryId', 'name slug icon');

    // 6. Return 404 if item does not exist
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Menu item not found with ID ${id}`,
      });
    }

    // 7. Successful response
    res.status(200).json({
      success: true,
      message: `Menu item availability updated to ${isAvailable ? 'available' : 'unavailable'} successfully`,
      data: updatedItem,
    });
  } catch (error) {
    console.error(`Error updating menu item availability for ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating menu item availability',
    });
  }
});

module.exports = router;

