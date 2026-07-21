const express = require("express");
const { createFeedback, getFeedback, getFeedbackSummary } = require("../controllers/feedbackController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createFeedback);
router.get("/", protect, getFeedback);
router.get("/summary", protect, getFeedbackSummary);

module.exports = router;
