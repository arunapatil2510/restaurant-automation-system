const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema(
  {
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    reservationDate: {
      type: String,
      required: [true, 'Reservation date is required'],
      index: true,
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer',
      },
      min: [1, 'Must be at least 1 guest'],
      max: [20, 'Maximum 20 guests per online booking'],
    },
    assignedTable: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    specialRequest: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
// Partial compound unique index: prevent double-booking confirmed reservations on the same table, date, and slot
ReservationSchema.index(
  { reservationDate: 1, timeSlot: 1, assignedTable: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'confirmed',
      assignedTable: { $gt: 0 },
    },
  }
);

const ALLOWED_RESERVATION_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['confirmed', 'cancelled']),
  confirmed: Object.freeze(['cancelled']),
  cancelled: Object.freeze([]),
});

const Reservation = mongoose.model('Reservation', ReservationSchema);
Reservation.ALLOWED_RESERVATION_TRANSITIONS = ALLOWED_RESERVATION_TRANSITIONS;

Reservation.on('index', (error) => {
  if (error) {
    console.warn(`[Reservation Model] Index build warning: ${error.message}`);
  }
});

module.exports = Reservation;
