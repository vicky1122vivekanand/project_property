const express = require("express");
const { getProperties, createProperty, getPropertyById, updateProperty } = require("../controllers/propertyController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getProperties);
router.post("/", protect, authorize("owner", "admin"), createProperty);
router.get("/:id", getPropertyById);
router.put("/:id", protect, authorize("owner", "admin"), updateProperty);

module.exports = router;
