const express = require("express");
const {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceStatus,
  assignMaintenanceRequest,
} = require("../controllers/maintenanceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getMaintenanceRequests);
router.post("/", protect, createMaintenanceRequest);
router.get("/:id", protect, getMaintenanceRequestById);
router.put("/:id/status", protect, authorize("staff", "owner", "admin"), updateMaintenanceStatus);
router.put("/:id/assign", protect, authorize("owner", "admin"), assignMaintenanceRequest);

module.exports = router;
