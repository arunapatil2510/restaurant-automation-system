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

module.exports = router;
