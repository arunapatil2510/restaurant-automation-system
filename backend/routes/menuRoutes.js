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

module.exports = router;
