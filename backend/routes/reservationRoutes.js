const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

// Helper to generate a sequential reservation number like RES-301, RES-302
const generateReservationNumber = async () => {
  const count = await Reservation.countDocuments();
  let baseNumber = 301 + count;
  let isUnique = false;
  let resNumber = '';
  
  while (!isUnique) {
    resNumber = `RES-${baseNumber}`;
    const exists = await Reservation.findOne({ reservationNumber: resNumber });
    if (exists) {
      baseNumber++; // If exists, increment and try again
    } else {
      isUnique = true;
    }
  }
  return resNumber;
};

// Middleware to protect admin routes
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
 * @route   POST /api/reservations
 * @desc    Create a new table reservation
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { 
      customerName, 
      phone, 
      email, 
      reservationDate, 
      timeSlot, 
      guestCount, 
      specialRequest 
    } = req.body;

    // Validation
    if (!customerName || !phone || !reservationDate || !timeSlot || !guestCount) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'customerName, phone, reservationDate, timeSlot, and guestCount are required.',
      });
    }

    if (guestCount < 1 || guestCount > 20) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'guestCount must be between 1 and 20.',
      });
    }

    const reservationNumber = await generateReservationNumber();

    const newReservation = new Reservation({
      reservationNumber,
      customerName,
      phone,
      email: email || '',
      reservationDate,
      timeSlot,
      guestCount,
      specialRequest: specialRequest || '',
      assignedTable: 0,
      status: 'pending'
    });

    await newReservation.save();

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: newReservation
    });

  } catch (error) {
    console.error('Error creating reservation:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while creating reservation',
    });
  }
});

/**
 * @route   GET /api/reservations
 * @desc    Fetch all reservations formatted for Admin UI
 * @access  Private (Admin)
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 }); // Newest first

    const data = reservations.map(resObj => ({
      id: resObj.reservationNumber,
      customerName: resObj.customerName,
      phone: resObj.phone,
      guests: `${resObj.guestCount} Guests`,
      date: `${resObj.reservationDate}, ${resObj.timeSlot}`,
      table: resObj.assignedTable === 0 ? 'Unassigned' : `Table ${resObj.assignedTable}`,
      status: resObj.status
    }));

    res.status(200).json({
      success: true,
      message: 'Reservations fetched successfully',
      data: data
    });
  } catch (error) {
    console.error('Error fetching reservations:', error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching reservations',
    });
  }
});

// Helper to query reservation by either MongoDB ObjectId or reservationNumber
const buildReservationQuery = (idOrNumber) => {
  const clean = (idOrNumber || '').trim();
  if (clean.match(/^[0-9a-fA-F]{24}$/)) {
    return { _id: clean };
  }
  return { reservationNumber: clean.toUpperCase() };
};

/**
 * @route   PATCH /api/reservations/:id/status
 * @desc    Update reservation status and/or assigned table (Admin/Staff)
 * @access  Private (Admin)
 */
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Reject empty body or non-object
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body cannot be empty.',
      });
    }

    // 2. Reject arbitrary unpermitted fields
    const allowedFields = ['status', 'assignedTable'];
    const bodyFields = Object.keys(req.body);
    const unpermittedFields = bodyFields.filter((f) => !allowedFields.includes(f));
    if (unpermittedFields.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Unpermitted field(s) in request body: ${unpermittedFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
      });
    }

    const { status, assignedTable } = req.body;
    const updates = {};

    // 3. Validate status (if provided)
    if (status !== undefined) {
      const validStatuses = ['pending', 'confirmed', 'cancelled'];
      if (typeof status !== 'string' || !validStatuses.includes(status.toLowerCase().trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid status provided. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      updates.status = status.toLowerCase().trim();
    }

    // 4. Validate assignedTable (if provided): must be integer between 1 and 20
    if (assignedTable !== undefined) {
      const parsedTable = typeof assignedTable === 'number' ? assignedTable : parseInt(assignedTable, 10);
      if (!Number.isInteger(parsedTable) || parsedTable < 1 || parsedTable > 20) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'assignedTable must be an integer between 1 and 20.',
        });
      }
      updates.assignedTable = parsedTable;
    }

    // 5. Require at least one valid field to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'At least one valid field (status or assignedTable) is required to update.',
      });
    }

    // 6. Locate reservation by ObjectId or reservationNumber
    const query = buildReservationQuery(id);
    const existingReservation = await Reservation.findOne(query);

    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Reservation not found with identifier '${id}'.`,
      });
    }

    // 7. Prevent assigning a table to a cancelled reservation
    const resultingStatus = updates.status !== undefined ? updates.status : existingReservation.status;
    if (updates.assignedTable !== undefined && resultingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Cannot assign a table to a cancelled reservation.',
      });
    }

    // 8. Apply updates
    const updatedReservation = await Reservation.findByIdAndUpdate(
      existingReservation._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data: updatedReservation,
    });
  } catch (error) {
    console.error(`Error updating reservation status for ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating reservation status',
    });
  }
});

module.exports = router;

