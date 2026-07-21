const mongoose = require("mongoose");

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    description: { type: String, default: "" },
    capacity: { type: Number, default: 1 },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "22:00" },
    isActive: { type: Boolean, default: true },
    // Manual owner-controlled switch - separate from per-slot booking
    // conflicts. An amenity can be "Available" overall (bookable, subject
    // to slot conflicts) or manually marked "Unavailable" (e.g. closed for
    // maintenance/repairs), which blocks all new bookings regardless of
    // whether a given time slot is free.
    availabilityStatus: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    unavailabilityReason: { type: String, default: "" },
  },
  { timestamps: true }
);

amenitySchema.index({ property: 1 });

module.exports = mongoose.model("Amenity", amenitySchema);
