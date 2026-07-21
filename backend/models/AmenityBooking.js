const mongoose = require("mongoose");

const amenityBookingSchema = new mongoose.Schema(
  {
    amenity: { type: mongoose.Schema.Types.ObjectId, ref: "Amenity", required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingDate: { type: String, required: true }, // YYYY-MM-DD
    checkInTime: { type: String, required: true }, // HH:mm
    checkOutTime: { type: String, required: true }, // HH:mm
    status: {
      type: String,
      enum: ["Booked", "Checked-In", "Checked-Out", "Cancelled"],
      default: "Booked",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Prevent exact duplicate slot at schema level too (extra safety)
amenityBookingSchema.index({ amenity: 1, bookingDate: 1, checkInTime: 1, checkOutTime: 1 });
// Speeds up "my bookings" and "today's bookings" style queries
amenityBookingSchema.index({ bookedBy: 1 });
amenityBookingSchema.index({ bookingDate: 1 });

module.exports = mongoose.model("AmenityBooking", amenityBookingSchema);
