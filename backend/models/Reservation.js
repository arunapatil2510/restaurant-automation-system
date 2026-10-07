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

module.exports = mongoose.model('Reservation', ReservationSchema);
