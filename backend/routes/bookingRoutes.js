const express = require("express");
const { createBooking, getBookings, updateBookingStatus } = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getBookings);
router.post("/", protect, authorize("tenant", "staff"), createBooking);
router.put("/:id/status", protect, updateBookingStatus);

module.exports = router;
