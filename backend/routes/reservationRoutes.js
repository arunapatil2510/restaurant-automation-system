const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

// Helper to generate collision-resistant reservation number (e.g. RES-1234567890)
const generateReservationNumber = () => {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `RES-${timestampPart}${randomPart}`;
};

// Helper to validate phone number (7 to 15 digits, allows +, spaces, hyphens, parentheses)
const isValidPhone = (phoneStr) => {
  if (typeof phoneStr !== 'string') return false;
  const trimmed = phoneStr.trim();
  if (!trimmed) return false;
  if (!/^\+?[0-9\s\-()]{7,25}$/.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

// Helper to validate real calendar date in YYYY-MM-DD format
const isValidCalendarDate = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
};

// Helper to get today's calendar date in restaurant local timezone (Asia/Kolkata)
const getRestaurantTodayDateString = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

// Helper to validate time slot and operating hours (11:00 AM to 11:00 PM)
const parseAndValidateTimeSlot = (slotStr) => {
  if (typeof slotStr !== 'string') {
    return { valid: false, error: 'format' };
  }
  const trimmed = slotStr.trim();
  if (!trimmed) {
    return { valid: false, error: 'format' };
  }

  // 12-hour format: e.g. "7:30 PM", "11:00 AM", "01:30 pm"
  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();

    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM') totalMinutes += 12 * 60;

    // Operating hours: 11:00 AM (660 mins) to 11:00 PM (1380 mins)
    if (totalMinutes < 660 || totalMinutes > 1380) {
      return { valid: false, error: 'hours' };
    }

    return { valid: true, formatted: `${hours}:${match12[2]} ${period}` };
  }

  // 24-hour format: e.g. "19:30", "11:00", "23:00"
  const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    const totalMinutes = hours * 60 + minutes;

    // Operating hours: 11:00 (660 mins) to 23:00 (1380 mins)
    if (totalMinutes < 660 || totalMinutes > 1380) {
      return { valid: false, error: 'hours' };
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return { valid: true, formatted: `${displayHours}:${match24[2]} ${period}` };
  }

  return { valid: false, error: 'format' };
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
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body must be a valid JSON object.',
      });
    }

    const { 
      customerName, 
      phone, 
      email, 
      reservationDate, 
      timeSlot, 
      guestCount, 
      specialRequest 
    } = req.body;

    // 1. customerName: non-empty trimmed string, max 100 characters
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'customerName is required and must be a non-empty string.',
      });
    }
    if (customerName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'customerName cannot exceed 100 characters.',
      });
    }

    // 2. phone: non-empty string with valid phone format (7 to 15 digits)
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'phone is required and must be a non-empty string.',
      });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'phone must be a valid phone number containing between 7 and 15 digits.',
      });
    }

    // 3. email: optional, but if provided must be a valid email format
    let cleanEmail = '';
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'email must be a string.',
        });
      }
      const trimmedEmail = email.trim();
      if (trimmedEmail.length > 0) {
        if (trimmedEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'email must be a valid email address.',
          });
        }
        cleanEmail = trimmedEmail;
      }
    }

    // 4. guestCount: integer from 1 to 20
    if (guestCount === undefined || guestCount === null) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'guestCount is required.',
      });
    }
    if (typeof guestCount !== 'number' || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'guestCount must be an integer between 1 and 20.',
      });
    }

    // 5. reservationDate: valid calendar date in YYYY-MM-DD format, not in the past
    if (!reservationDate || typeof reservationDate !== 'string' || !isValidCalendarDate(reservationDate.trim())) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'reservationDate must be a valid calendar date in YYYY-MM-DD format.',
      });
    }
    const cleanDate = reservationDate.trim();
    const todayDate = getRestaurantTodayDateString();
    if (cleanDate < todayDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `reservationDate cannot be in the past. Restaurant date today is ${todayDate}.`,
      });
    }

    // 6. timeSlot: valid format and within operating hours (11:00 AM - 11:00 PM)
    if (!timeSlot || typeof timeSlot !== 'string' || !timeSlot.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'timeSlot is required.',
      });
    }
    const timeSlotResult = parseAndValidateTimeSlot(timeSlot);
    if (!timeSlotResult.valid) {
      if (timeSlotResult.error === 'hours') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'timeSlot must be within restaurant operating hours (11:00 AM to 11:00 PM).',
        });
      }
      return res.status(400).json({
        success: false,
        data: null,
        message: "timeSlot must be in a valid format, such as '7:30 PM' or '19:30'.",
      });
    }

    // 7. specialRequest: optional string, max 500 characters
    let cleanSpecialRequest = '';
    if (specialRequest !== undefined && specialRequest !== null) {
      if (typeof specialRequest !== 'string') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'specialRequest must be a string.',
        });
      }
      if (specialRequest.length > 500) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'specialRequest cannot exceed 500 characters.',
        });
      }
      cleanSpecialRequest = specialRequest.trim();
    }

    // 8. Bounded retry on reservation-number collision
    const MAX_RETRIES = 5;
    let newReservation = null;
    let saved = false;

    const generatorFn = router.generateReservationNumber || generateReservationNumber;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const reservationNumber = generatorFn();
        newReservation = new Reservation({
          reservationNumber,
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          reservationDate: cleanDate,
          timeSlot: timeSlotResult.formatted,
          guestCount,
          specialRequest: cleanSpecialRequest,
          assignedTable: 0,
          status: 'pending',
        });

        await newReservation.save();
        saved = true;
        break;
      } catch (saveError) {
        const isReservationNumberCollision =
          saveError.code === 11000 &&
          (Boolean(saveError.keyPattern?.reservationNumber) ||
            Boolean(saveError.keyValue && 'reservationNumber' in saveError.keyValue) ||
            (typeof saveError.message === 'string' && saveError.message.includes('reservationNumber')));

        if (isReservationNumberCollision && attempt < MAX_RETRIES) {
          console.warn(`Reservation number collision on attempt ${attempt}, retrying...`);
          continue;
        }
        throw saveError;
      }
    }

    if (!saved || !newReservation) {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error while creating reservation',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: newReservation,
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

router.generateReservationNumber = generateReservationNumber;
router.isValidPhone = isValidPhone;
router.isValidCalendarDate = isValidCalendarDate;
router.getRestaurantTodayDateString = getRestaurantTodayDateString;
router.parseAndValidateTimeSlot = parseAndValidateTimeSlot;

module.exports = router;

