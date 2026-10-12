const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/admin/login
 * @desc    Authenticate admin user and return admin key & profile
 * @access  Public
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};

    // 1. Validate request body presence and non-empty strings
    if (
      !username ||
      typeof username !== 'string' ||
      !username.trim() ||
      !password ||
      typeof password !== 'string' ||
      !password.trim()
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Username and password are required and cannot be empty.',
      });
    }

    // 2. Safe server configuration validation (never expose secret details)
    const secretKey = process.env.ADMIN_SECRET_KEY;
    if (!secretKey) {
      console.error('Server configuration error: ADMIN_SECRET_KEY is not defined in environment.');
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server authentication configuration error. Please contact the administrator.',
      });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 3. Validate authorized administrator username rule
    // Configurable via ADMIN_USERNAME in environment, defaulting to 'admin' or 'admin@restosmart.com'
    const configuredAdminUser = process.env.ADMIN_USERNAME
      ? process.env.ADMIN_USERNAME.trim().toLowerCase()
      : null;

    const isAuthorizedUser = configuredAdminUser
      ? cleanUser === configuredAdminUser
      : cleanUser === 'admin' || cleanUser === 'admin@restosmart.com';

    // 4. Validate credentials
    if (!isAuthorizedUser || cleanPass !== secretKey) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid admin credentials.',
      });
    }

    // 5. Successful response with profile and key needed for x-admin-key header
    return res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      data: {
        username: cleanUser,
        name: 'Restaurant Manager',
        role: 'Admin / Manager',
        email: cleanUser.includes('@') ? cleanUser : 'admin@restosmart.com',
        adminKey: secretKey,
      },
    });
  } catch (error) {
    console.error('Error during admin authentication:', error.message);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error during authentication.',
    });
  }
});

/**
 * @route   GET /api/admin/verify
 * @desc    Verify existing session / x-admin-key header
 * @access  Private (Admin)
 */
router.get('/verify', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const secretKey = process.env.ADMIN_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server authentication configuration error.',
    });
  }

  if (!adminKey || adminKey !== secretKey) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Unauthorized access. Invalid or missing admin key.',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Admin session is valid',
    data: {
      role: 'Admin / Manager',
      status: 'authenticated',
    },
  });
});

module.exports = router;
