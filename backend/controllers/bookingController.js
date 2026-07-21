const asyncHandler = require("express-async-handler");
const AmenityBooking = require("../models/AmenityBooking");
const Amenity = require("../models/Amenity");

// Convert "HH:mm" to minutes since midnight for easy comparison
const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Checks whether [startA,endA) overlaps [startB,endB)
const isOverlapping = (startA, endA, startB, endB) => startA < endB && startB < endA;

// @desc    Create amenity booking (with conflict prevention)
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { amenity, bookingDate, checkInTime, checkOutTime, notes } = req.body;

  if (!amenity || !bookingDate || !checkInTime || !checkOutTime) {
    res.status(400);
    throw new Error("Amenity, date, check-in and check-out time are required");
  }

  const newStart = toMinutes(checkInTime);
  const newEnd = toMinutes(checkOutTime);

  if (newEnd <= newStart) {
    res.status(400);
    throw new Error("Check-out time must be after check-in time");
  }

  const amenityDoc = await Amenity.findById(amenity);
  if (!amenityDoc) {
    res.status(404);
    throw new Error("Amenity not found");
  }

  // A manually "Unavailable" amenity (e.g. closed for maintenance) blocks
  // ALL new bookings, regardless of whether the specific slot is free.
  if (amenityDoc.availabilityStatus === "Unavailable") {
    res.status(400);
    throw new Error(
      amenityDoc.unavailabilityReason
        ? `This amenity is currently unavailable: ${amenityDoc.unavailabilityReason}`
        : "This amenity is currently marked unavailable and cannot be booked."
    );
  }

  // Enforce amenity's operating hours
  const openMinutes = toMinutes(amenityDoc.openTime);
  const closeMinutes = toMinutes(amenityDoc.closeTime);
  if (newStart < openMinutes || newEnd > closeMinutes) {
    res.status(400);
    throw new Error(`Booking must be within operating hours (${amenityDoc.openTime} - ${amenityDoc.closeTime})`);
  }

  // Fetch existing (non-cancelled) bookings for the same amenity/date
  const existingBookings = await AmenityBooking.find({
    amenity,
    bookingDate,
    status: { $ne: "Cancelled" },
  });

  const capacity = amenityDoc.capacity || 1;

  // Count how many existing bookings overlap the requested slot
  const overlappingCount = existingBookings.filter((b) =>
    isOverlapping(newStart, newEnd, toMinutes(b.checkInTime), toMinutes(b.checkOutTime))
  ).length;

  if (overlappingCount >= capacity) {
    res.status(409);
    throw new Error("This time slot is already booked (conflict detected). Please choose another slot.");
  }

  const booking = await AmenityBooking.create({
    amenity,
    bookedBy: req.user._id,
    bookingDate,
    checkInTime,
    checkOutTime,
    notes,
  });

  const populated = await booking.populate([
    { path: "amenity", select: "name property capacity" },
    { path: "bookedBy", select: "name email" },
  ]);

  const io = req.app.get("io");
  io.emit("booking:created", populated);

  res.status(201).json({ success: true, data: populated });
});

// @desc    Get bookings (optionally filter by amenity, date, mine)
// @route   GET /api/bookings
// @access  Private
const getBookings = asyncHandler(async (req, res) => {
  const filter = {};
  const { amenity, date, mine } = req.query;

  if (amenity) filter.amenity = amenity;
  if (date) filter.bookingDate = date;
  if (mine === "true") filter.bookedBy = req.user._id;

  const bookings = await AmenityBooking.find(filter)
    .populate("amenity", "name property capacity")
    .populate("bookedBy", "name email")
    .sort({ bookingDate: 1, checkInTime: 1 });

  res.json({ success: true, data: bookings });
});

// @desc    Update booking status (check-in / check-out / cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Booked", "Checked-In", "Checked-Out", "Cancelled"];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const booking = await AmenityBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  booking.status = status;
  await booking.save();

  const populated = await booking.populate([
    { path: "amenity", select: "name property capacity" },
    { path: "bookedBy", select: "name email" },
  ]);

  const io = req.app.get("io");
  io.emit("booking:updated", populated);

  res.json({ success: true, data: populated });
});

module.exports = { createBooking, getBookings, updateBookingStatus };
