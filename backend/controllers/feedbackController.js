const asyncHandler = require("express-async-handler");
const Feedback = require("../models/Feedback");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Property = require("../models/Property");

// @desc    Submit a 1-5 satisfaction rating for a completed maintenance
//          request. Only the tenant who raised it can rate it, and only
//          once it's Completed, and only once ever.
// @route   POST /api/feedback
// @access  Private
const createFeedback = asyncHandler(async (req, res) => {
  const { maintenanceRequest, rating, comment } = req.body;

  if (!maintenanceRequest || !rating) {
    res.status(400);
    throw new Error("Maintenance request and rating are required");
  }
  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const request = await MaintenanceRequest.findById(maintenanceRequest);
  if (!request) {
    res.status(404);
    throw new Error("Maintenance request not found");
  }

  if (request.requestedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the person who raised this request can rate it");
  }

  if (request.status !== "Completed") {
    res.status(400);
    throw new Error("You can only rate a request once it has been marked Completed");
  }

  const existing = await Feedback.findOne({ maintenanceRequest });
  if (existing) {
    res.status(400);
    throw new Error("Feedback has already been submitted for this request");
  }

  const feedback = await Feedback.create({
    property: request.property,
    maintenanceRequest,
    submittedBy: req.user._id,
    rating,
    comment: comment || "",
  });

  const propertyDoc = await Property.findById(request.property).select("owner");

  const io = req.app.get("io");
  const targets = new Set([req.user._id.toString()]);
  if (propertyDoc?.owner) targets.add(propertyDoc.owner.toString());
  if (request.assignedTo) targets.add(request.assignedTo.toString());
  io.to(Array.from(targets)).emit("feedback:created", feedback);

  res.status(201).json({ success: true, data: feedback });
});

// @desc    Get feedback entries, scoped by role: tenants see their own,
//          staff see feedback for requests assigned to them, owners/admins
//          see everything on their property.
// @route   GET /api/feedback
// @access  Private
const getFeedback = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "tenant") {
    filter.submittedBy = req.user._id;
  } else if (req.user.role === "staff") {
    const myRequestIds = await MaintenanceRequest.find({ assignedTo: req.user._id }).distinct("_id");
    filter.maintenanceRequest = { $in: myRequestIds };
  } else if (["owner", "admin"].includes(req.user.role)) {
    filter.property = req.user.property;
  }

  const feedback = await Feedback.find(filter)
    .populate("submittedBy", "name")
    .populate({ path: "maintenanceRequest", select: "issueTitle category" })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: feedback });
});

// @desc    Get the satisfaction score summary against the ≥ 4/5 KPI target,
//          scoped the same way as getFeedback.
// @route   GET /api/feedback/summary
// @access  Private
const getFeedbackSummary = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "tenant") {
    filter.submittedBy = req.user._id;
  } else if (req.user.role === "staff") {
    const myRequestIds = await MaintenanceRequest.find({ assignedTo: req.user._id }).distinct("_id");
    filter.maintenanceRequest = { $in: myRequestIds };
  } else if (["owner", "admin"].includes(req.user.role)) {
    filter.property = req.user.property;
  }

  const entries = await Feedback.find(filter).select("rating");
  const count = entries.length;
  const avgRating = count > 0 ? Math.round((entries.reduce((sum, f) => sum + f.rating, 0) / count) * 10) / 10 : null;

  res.json({
    success: true,
    data: {
      avgRating,
      count,
      target: 4,
      meetsTarget: avgRating !== null ? avgRating >= 4 : null,
    },
  });
});

module.exports = { createFeedback, getFeedback, getFeedbackSummary };
