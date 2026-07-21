const express = require("express");
const {
  createAmenity,
  getAmenities,
  getAmenityById,
  updateAmenityAvailability,
} = require("../controllers/amenityController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getAmenities);
router.post("/", protect, authorize("owner", "admin"), createAmenity);
router.get("/:id", protect, getAmenityById);
router.put("/:id/availability", protect, authorize("owner", "admin"), updateAmenityAvailability);

module.exports = router;
