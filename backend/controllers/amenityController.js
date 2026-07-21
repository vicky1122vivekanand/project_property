const asyncHandler = require("express-async-handler");
const Amenity = require("../models/Amenity");
const AmenityBooking = require("../models/AmenityBooking");

// @desc    Create amenity
// @route   POST /api/amenities
// @access  Private (owner/admin)
const createAmenity = asyncHandler(async (req, res) => {
  const { name, property, description, capacity, openTime, closeTime, availabilityStatus } = req.body;

  if (!name || !property) {
    res.status(400);
    throw new Error("Name and property are required");
  }

  const amenity = await Amenity.create({
    name,
    property,
    description,
    capacity,
    openTime,
    closeTime,
    availabilityStatus: availabilityStatus === "Unavailable" ? "Unavailable" : "Available",
  });

  res.status(201).json({ success: true, data: amenity });
});

// @desc    Get all amenities (optionally by property)
// @route   GET /api/amenities
// @access  Private
const getAmenities = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.property) filter.property = req.query.property;

  const amenities = await Amenity.find(filter).populate("property", "name address");

  res.json({ success: true, data: amenities });
});

// @desc    Get single amenity with its bookings for a given date
// @route   GET /api/amenities/:id
// @access  Private
const getAmenityById = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findById(req.params.id).populate("property", "name address");
  if (!amenity) {
    res.status(404);
    throw new Error("Amenity not found");
  }

  const { date } = req.query;
  const bookingFilter = { amenity: amenity._id, status: { $ne: "Cancelled" } };
  if (date) bookingFilter.bookingDate = date;

  const bookings = await AmenityBooking.find(bookingFilter)
    .populate("bookedBy", "name email")
    .sort({ bookingDate: 1, checkInTime: 1 });

  res.json({ success: true, data: { amenity, bookings } });
});

// @desc    Toggle an amenity's overall availability status (e.g. mark it
//          closed for maintenance). Separate from per-slot booking
//          conflicts - this blocks ALL new bookings while Unavailable.
// @route   PUT /api/amenities/:id/availability
// @access  Private (owner/admin)
const updateAmenityAvailability = asyncHandler(async (req, res) => {
  const { availabilityStatus, unavailabilityReason } = req.body;

  if (!["Available", "Unavailable"].includes(availabilityStatus)) {
    res.status(400);
    throw new Error("availabilityStatus must be 'Available' or 'Unavailable'");
  }

  const amenity = await Amenity.findById(req.params.id);
  if (!amenity) {
    res.status(404);
    throw new Error("Amenity not found");
  }

  amenity.availabilityStatus = availabilityStatus;
  amenity.unavailabilityReason = availabilityStatus === "Unavailable" ? unavailabilityReason || "" : "";
  await amenity.save();

  const populated = await amenity.populate("property", "name address");

  const io = req.app.get("io");
  io.emit("amenity:updated", populated);

  res.json({ success: true, data: populated });
});

module.exports = { createAmenity, getAmenities, getAmenityById, updateAmenityAvailability };
