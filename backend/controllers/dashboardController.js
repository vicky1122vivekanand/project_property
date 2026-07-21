const asyncHandler = require("express-async-handler");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const AmenityBooking = require("../models/AmenityBooking");
const Amenity = require("../models/Amenity");
const Feedback = require("../models/Feedback");

// @desc    Get dashboard overview - the data returned differs by role, not
//          just relabeled: tenants see their own activity, staff see only
//          what's assigned to them, owners see the whole property plus a
//          heads-up on anything still waiting to be assigned.
// @route   GET /api/dashboard/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const maintenanceFilter = {};
  const bookingFilter = { status: { $ne: "Cancelled" } };
  const feedbackFilter = {};

  if (role === "tenant") {
    maintenanceFilter.requestedBy = req.user._id;
    bookingFilter.bookedBy = req.user._id;
    feedbackFilter.submittedBy = req.user._id;
  } else if (role === "staff") {
    maintenanceFilter.assignedTo = req.user._id;
    // Staff still manage check-in/out for all bookings, so booking stats
    // stay property-wide for them rather than filtered to "their own".
  } else if (["owner", "admin"].includes(role)) {
    feedbackFilter.property = req.user.property;
  }

  const [pending, inProgress, completed, totalRequests] = await Promise.all([
    MaintenanceRequest.countDocuments({ ...maintenanceFilter, status: "Pending" }),
    MaintenanceRequest.countDocuments({ ...maintenanceFilter, status: "In Progress" }),
    MaintenanceRequest.countDocuments({ ...maintenanceFilter, status: "Completed" }),
    MaintenanceRequest.countDocuments(maintenanceFilter),
  ]);

  // Average resolution time (hours) for completed requests in scope
  const completedRequests = await MaintenanceRequest.find({
    ...maintenanceFilter,
    status: "Completed",
    resolutionDate: { $ne: null },
  }).select("createdAt resolutionDate");

  let avgResolutionHours = 0;
  if (completedRequests.length > 0) {
    const totalHours = completedRequests.reduce((sum, r) => {
      const diffMs = new Date(r.resolutionDate) - new Date(r.createdAt);
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round((totalHours / completedRequests.length) * 10) / 10;
  }

  const completionRate = totalRequests > 0 ? Math.round((completed / totalRequests) * 1000) / 10 : 0;

  // Owner/admin-only: requests still waiting to be handed off to staff
  let unassignedCount = 0;
  if (["owner", "admin"].includes(role)) {
    unassignedCount = await MaintenanceRequest.countDocuments({ status: "Pending", assignedTo: null });
  }

  // Staff-only: scope their feedback filter to requests assigned to them
  // (can't be known until we have their maintenance filter above).
  if (role === "staff") {
    const myRequestIds = await MaintenanceRequest.find({ assignedTo: req.user._id }).distinct("_id");
    feedbackFilter.maintenanceRequest = { $in: myRequestIds };
  }

  const totalAmenities = await Amenity.countDocuments({ isActive: true });
  const totalBookings = await AmenityBooking.countDocuments(bookingFilter);
  const today = new Date().toISOString().slice(0, 10);
  const todaysBookings = await AmenityBooking.countDocuments({ ...bookingFilter, bookingDate: today });

  // ---- User Satisfaction Score KPI (target: >= 4/5) ----
  const feedbackEntries = await Feedback.find(feedbackFilter).select("rating");
  const feedbackCount = feedbackEntries.length;
  const avgSatisfaction =
    feedbackCount > 0
      ? Math.round((feedbackEntries.reduce((sum, f) => sum + f.rating, 0) / feedbackCount) * 10) / 10
      : null;

  // Tenant-only: how many of their completed requests still need a rating,
  // so the UI can prompt them.
  let pendingFeedbackCount = 0;
  if (role === "tenant") {
    const completedIds = await MaintenanceRequest.find({
      requestedBy: req.user._id,
      status: "Completed",
    }).distinct("_id");
    const ratedIds = await Feedback.find({ maintenanceRequest: { $in: completedIds } }).distinct(
      "maintenanceRequest"
    );
    pendingFeedbackCount = completedIds.length - ratedIds.length;
  }

  res.json({
    success: true,
    data: {
      role,
      maintenance: {
        pending,
        inProgress,
        completed,
        totalRequests,
        avgResolutionHours,
        completionRate,
        unassignedCount,
      },
      amenities: {
        totalAmenities,
        totalBookings,
        todaysBookings,
      },
      satisfaction: {
        avgRating: avgSatisfaction,
        count: feedbackCount,
        target: 4,
        meetsTarget: avgSatisfaction !== null ? avgSatisfaction >= 4 : null,
        pendingFeedbackCount,
      },
    },
  });
});

module.exports = { getOverview };
