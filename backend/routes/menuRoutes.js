const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// Helper to validate HTTP or HTTPS URL format
const isValidHttpUrl = (str) => {
  if (typeof str !== 'string') return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

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
 * @route   POST /api/menu
 * @desc    Create a new menu item (Admin)
 * @access  Private (Admin)
 */
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    // 1. Reject empty body, non-object, or array
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body cannot be empty.',
      });
    }

    // 2. Reject arbitrary unpermitted fields
    const allowedFields = [
      'name',
      'description',
      'categoryId',
      'price',
      'type',
      'isAvailable',
      'isSpecial',
      'prepTime',
      'image',
      'ingredients',
      'dietaryTags',
    ];
    const bodyKeys = Object.keys(req.body);
    const unpermittedKeys = bodyKeys.filter((k) => !allowedFields.includes(k));
    if (unpermittedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Unpermitted field(s) in request body: ${unpermittedKeys.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
      });
    }

    const {
      name,
      description,
      categoryId,
      price,
      type,
      isAvailable,
      isSpecial,
      prepTime,
      image,
      ingredients,
      dietaryTags,
    } = req.body;

    // 3. Validate name: required non-empty string, max 100 chars
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'name is required and must be a non-empty string.',
      });
    }
    const cleanName = name.trim();
    if (cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'name cannot exceed 100 characters.',
      });
    }

    // 4. Validate description: required non-empty string, max 1000 chars
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'description is required and must be a non-empty string.',
      });
    }
    const cleanDescription = description.trim();
    if (cleanDescription.length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'description cannot exceed 1000 characters.',
      });
    }

    // 5. Validate categoryId: required 24-hex ObjectId, must reference existing Category
    if (typeof categoryId !== 'string' || !categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'categoryId must be a valid 24-character hexadecimal ObjectId.',
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Category not found with ID '${categoryId}'.`,
      });
    }

    // 6. Validate price: required finite non-negative number
    if (typeof price !== 'number' || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'price is required and must be a finite, non-negative number.',
      });
    }

    // 7. Validate type: optional enum ['veg', 'nonveg', 'egg'], defaults to 'veg'
    let cleanType = 'veg';
    if (type !== undefined) {
      const validTypes = ['veg', 'nonveg', 'egg'];
      if (typeof type !== 'string' || !validTypes.includes(type.toLowerCase().trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `type must be one of: ${validTypes.join(', ')}.`,
        });
      }
      cleanType = type.toLowerCase().trim();
    }

    // 8. Validate isAvailable: optional boolean, defaults to true
    let cleanIsAvailable = true;
    if (isAvailable !== undefined) {
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          success: false,
          data: null,
          message: "'isAvailable' must be a boolean (true or false).",
        });
      }
      cleanIsAvailable = isAvailable;
    }

    // 9. Validate isSpecial: optional boolean, defaults to false
    let cleanIsSpecial = false;
    if (isSpecial !== undefined) {
      if (typeof isSpecial !== 'boolean') {
        return res.status(400).json({
          success: false,
          data: null,
          message: "'isSpecial' must be a boolean (true or false).",
        });
      }
      cleanIsSpecial = isSpecial;
    }

    // 10. Validate prepTime: optional string, defaults to '15 min'
    let cleanPrepTime = '15 min';
    if (prepTime !== undefined) {
      if (typeof prepTime !== 'string' || !prepTime.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'prepTime must be a non-empty string.',
        });
      }
      if (prepTime.trim().length > 50) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'prepTime cannot exceed 50 characters.',
        });
      }
      cleanPrepTime = prepTime.trim();
    }

    // 11. Validate image: optional string URL, defaults to ''
    let cleanImage = '';
    if (image !== undefined) {
      if (typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'image must be a string URL.',
        });
      }
      cleanImage = image.trim();
    }

    // 12. Validate ingredients: optional array of strings, defaults to []
    let cleanIngredients = [];
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'ingredients must be an array of strings.',
        });
      }
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (typeof ing !== 'string' || !ing.trim()) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `ingredients[${i}] must be a non-empty string.`,
          });
        }
        cleanIngredients.push(ing.trim());
      }
    }

    // 13. Validate dietaryTags: optional array of strings, defaults to []
    let cleanDietaryTags = [];
    if (dietaryTags !== undefined) {
      if (!Array.isArray(dietaryTags)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'dietaryTags must be an array of strings.',
        });
      }
      for (let i = 0; i < dietaryTags.length; i++) {
        const tag = dietaryTags[i];
        if (typeof tag !== 'string' || !tag.trim()) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `dietaryTags[${i}] must be a non-empty string.`,
          });
        }
        cleanDietaryTags.push(tag.trim().toLowerCase());
      }
    }

    // 14. Create and save new MenuItem
    const newMenuItem = new MenuItem({
      name: cleanName,
      description: cleanDescription,
      categoryId: category._id,
      categorySlug: category.slug,
      price,
      type: cleanType,
      isAvailable: cleanIsAvailable,
      isSpecial: cleanIsSpecial,
      prepTime: cleanPrepTime,
      image: cleanImage,
      ingredients: cleanIngredients,
      dietaryTags: cleanDietaryTags,
    });

    await newMenuItem.save();
    await newMenuItem.populate('categoryId', 'name slug icon');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: newMenuItem,
    });
  } catch (error) {
    console.error('Error creating menu item:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while creating menu item',
    });
  }
});

/**
 * @route   PUT /api/menu/:id
 * @desc    Update an existing menu item (Admin)
 * @access  Private (Admin)
 */
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate MongoDB ObjectId format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid menu item ID format: '${id}'. Must be a 24-character hexadecimal ObjectId.`,
      });
    }

    // 2. Reject empty body, non-object, or array
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body cannot be empty.',
      });
    }

    // 3. Strict allowlist - reject unpermitted fields (e.g. _id, categorySlug, createdAt, updatedAt, __v, rating)
    const allowedFields = [
      'name',
      'description',
      'categoryId',
      'price',
      'type',
      'isAvailable',
      'isSpecial',
      'prepTime',
      'image',
      'ingredients',
      'dietaryTags',
    ];
    const bodyKeys = Object.keys(req.body);
    const unpermittedKeys = bodyKeys.filter((k) => !allowedFields.includes(k));
    if (unpermittedKeys.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Unpermitted field(s) in request body: ${unpermittedKeys.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
      });
    }

    // 4. Locate existing menu item
    const existingItem = await MenuItem.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Menu item not found with ID '${id}'.`,
      });
    }

    const {
      name,
      description,
      categoryId,
      price,
      type,
      isAvailable,
      isSpecial,
      prepTime,
      image,
      ingredients,
      dietaryTags,
    } = req.body;

    const updateFields = {};

    // 5. Validate name (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'name must be a non-empty string.',
        });
      }
      const cleanName = name.trim();
      if (cleanName.length > 100) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'name cannot exceed 100 characters.',
        });
      }
      updateFields.name = cleanName;
    }

    // 6. Validate description (if provided)
    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'description must be a non-empty string.',
        });
      }
      const cleanDescription = description.trim();
      if (cleanDescription.length > 1000) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'description cannot exceed 1000 characters.',
        });
      }
      updateFields.description = cleanDescription;
    }

    // 7. Validate categoryId (if provided) & auto-sync categorySlug
    if (categoryId !== undefined) {
      if (typeof categoryId !== 'string' || !categoryId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'categoryId must be a valid 24-character hexadecimal ObjectId.',
        });
      }
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Category not found with ID '${categoryId}'.`,
        });
      }
      updateFields.categoryId = category._id;
      updateFields.categorySlug = category.slug;
    }

    // 8. Validate price (if provided)
    if (price !== undefined) {
      if (typeof price !== 'number' || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'price must be a finite, non-negative number.',
        });
      }
      updateFields.price = price;
    }

    // 9. Validate type (if provided)
    if (type !== undefined) {
      const validTypes = ['veg', 'nonveg', 'egg'];
      if (typeof type !== 'string' || !validTypes.includes(type.toLowerCase().trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `type must be one of: ${validTypes.join(', ')}.`,
        });
      }
      updateFields.type = type.toLowerCase().trim();
    }

    // 10. Validate isAvailable (if provided)
    if (isAvailable !== undefined) {
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          success: false,
          data: null,
          message: "'isAvailable' must be a boolean (true or false).",
        });
      }
      updateFields.isAvailable = isAvailable;
    }

    // 11. Validate isSpecial (if provided)
    if (isSpecial !== undefined) {
      if (typeof isSpecial !== 'boolean') {
        return res.status(400).json({
          success: false,
          data: null,
          message: "'isSpecial' must be a boolean (true or false).",
        });
      }
      updateFields.isSpecial = isSpecial;
    }

    // 12. Validate prepTime (if provided)
    if (prepTime !== undefined) {
      if (typeof prepTime !== 'string' || !prepTime.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'prepTime must be a non-empty string.',
        });
      }
      if (prepTime.trim().length > 50) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'prepTime cannot exceed 50 characters.',
        });
      }
      updateFields.prepTime = prepTime.trim();
    }

    // 13. Validate image (if provided): must be valid HTTP/HTTPS URL or empty string
    if (image !== undefined) {
      if (typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'image must be a string.',
        });
      }
      const trimmedImage = image.trim();
      if (trimmedImage.length > 0 && !isValidHttpUrl(trimmedImage)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'image must be a valid HTTP or HTTPS URL, or an empty string.',
        });
      }
      updateFields.image = trimmedImage;
    }

    // 14. Validate ingredients (if provided)
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'ingredients must be an array of strings.',
        });
      }
      const cleanIngredients = [];
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (typeof ing !== 'string' || !ing.trim()) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `ingredients[${i}] must be a non-empty string.`,
          });
        }
        cleanIngredients.push(ing.trim());
      }
      updateFields.ingredients = cleanIngredients;
    }

    // 15. Validate dietaryTags (if provided)
    if (dietaryTags !== undefined) {
      if (!Array.isArray(dietaryTags)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'dietaryTags must be an array of strings.',
        });
      }
      const cleanDietaryTags = [];
      for (let i = 0; i < dietaryTags.length; i++) {
        const tag = dietaryTags[i];
        if (typeof tag !== 'string' || !tag.trim()) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `dietaryTags[${i}] must be a non-empty string.`,
          });
        }
        cleanDietaryTags.push(tag.trim().toLowerCase());
      }
      updateFields.dietaryTags = cleanDietaryTags;
    }

    // 16. Require at least one valid field to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'At least one valid field to update must be provided.',
      });
    }

    // 17. Atomic CAS update using version key (__v) to prevent concurrent lost updates
    const casFilter = { _id: existingItem._id };
    const updateDoc = {};

    if (typeof existingItem.__v === 'number' && Number.isFinite(existingItem.__v)) {
      casFilter.__v = existingItem.__v;
      updateDoc.$set = updateFields;
      updateDoc.$inc = { __v: 1 };
    } else {
      casFilter.$or = [{ __v: { $exists: false } }, { __v: null }];
      updateDoc.$set = { ...updateFields, __v: 1 };
    }

    const updatedItem = await MenuItem.findOneAndUpdate(
      casFilter,
      updateDoc,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name slug icon');

    if (!updatedItem) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'Menu item was modified concurrently. Please refresh and try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    console.error(`Error updating menu item ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating menu item',
    });
  }
});

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
