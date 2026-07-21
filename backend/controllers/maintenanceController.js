const asyncHandler = require("express-async-handler");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const AmenityBooking = require("../models/AmenityBooking");
const Property = require("../models/Property");

// Builds the list of private socket rooms (user IDs) that should be notified
// about a given request: the tenant who raised it, the property owner, and
// (once assigned) the staff member handling it. This keeps staff from ever
// receiving a real-time event about a request that hasn't been assigned to
// them yet - not just filtered out of the list view, but never sent at all.
const getNotifyTargets = (request, ownerId) => {
  const targets = new Set();
  if (request.requestedBy) targets.add(request.requestedBy.toString());
  if (ownerId) targets.add(ownerId.toString());
  if (request.assignedTo) targets.add(request.assignedTo.toString());
  return Array.from(targets);
};

// @desc    Create maintenance request
// @route   POST /api/maintenance
// @access  Private
const createMaintenanceRequest = asyncHandler(async (req, res) => {
  const { property, issueTitle, issueDescription, category, priority } = req.body;

  if (!property || !issueTitle || !issueDescription) {
    res.status(400);
    throw new Error("Property, issue title and description are required");
  }

  // Tenants may only raise a maintenance request once they have booked
  // at least one amenity (proof of active, engaged tenancy).
  if (req.user.role === "tenant") {
    const hasBooking = await AmenityBooking.exists({ bookedBy: req.user._id });
    if (!hasBooking) {
      res.status(403);
      throw new Error("You need to book an amenity at least once before you can submit a maintenance request.");
    }
  }

  const propertyDoc = await Property.findById(property).select("owner");

  // New requests always start unassigned - they go to the owner first.
  // Staff only gets involved once the owner explicitly assigns them.
  const request = await MaintenanceRequest.create({
    property,
    requestedBy: req.user._id,
    issueTitle,
    issueDescription,
    category,
    priority,
    assignedTo: null,
    statusHistory: [{ status: "Pending", changedBy: req.user._id }],
  });

  const populated = await request.populate([
    { path: "property", select: "name address" },
    { path: "requestedBy", select: "name email" },
  ]);

  const io = req.app.get("io");
  const targets = getNotifyTargets(request, propertyDoc?.owner);
  io.to(targets).emit("maintenance:created", populated);

  res.status(201).json({ success: true, data: populated });
});

// @desc    Get maintenance requests (optionally filtered by property/status/user)
// @route   GET /api/maintenance
// @access  Private
const getMaintenanceRequests = asyncHandler(async (req, res) => {
  const filter = {};
  const { status, property, mine, unassigned } = req.query;

  if (status) filter.status = status;
  if (property) filter.property = property;
  if (mine === "true") filter.requestedBy = req.user._id;

  // Tenants only ever see their own requests.
  if (req.user.role === "tenant") {
    filter.requestedBy = req.user._id;
  }

  // Staff only ever see requests that have been assigned to them by the
  // owner - a brand-new, unassigned request stays with the owner until
  // they hand it off.
  if (req.user.role === "staff") {
    filter.assignedTo = req.user._id;
  }

  // Owner/admin convenience filter: requests still waiting to be assigned.
  if (unassigned === "true" && ["owner", "admin"].includes(req.user.role)) {
    filter.assignedTo = null;
  }

  const requests = await MaintenanceRequest.find(filter)
    .populate("property", "name address")
    .populate("requestedBy", "name email")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

// @desc    Get single maintenance request
// @route   GET /api/maintenance/:id
// @access  Private
const getMaintenanceRequestById = asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findById(req.params.id)
    .populate("property", "name address")
    .populate("requestedBy", "name email")
    .populate("assignedTo", "name email");

  if (!request) {
    res.status(404);
    throw new Error("Maintenance request not found");
  }

  // A staff member may only view a request once it's assigned to them.
  if (
    req.user.role === "staff" &&
    (!request.assignedTo || request.assignedTo._id.toString() !== req.user._id.toString())
  ) {
    res.status(403);
    throw new Error("This request has not been assigned to you");
  }

  // A tenant may only view their own request.
  if (req.user.role === "tenant" && request.requestedBy._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to view this request");
  }

  res.json({ success: true, data: request });
});

// @desc    Update maintenance request status
// @route   PUT /api/maintenance/:id/status
// @access  Private (staff/owner/admin)
const updateMaintenanceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Pending", "In Progress", "Completed"];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Maintenance request not found");
  }

  // Staff can only update requests that have actually been assigned to them.
  if (req.user.role === "staff" && (!request.assignedTo || request.assignedTo.toString() !== req.user._id.toString())) {
    res.status(403);
    throw new Error("You can only update requests assigned to you");
  }

  request.status = status;
  request.statusHistory.push({ status, changedBy: req.user._id });
  if (status === "Completed") {
    request.resolutionDate = new Date();
  }

  await request.save();

  const propertyDoc = await Property.findById(request.property).select("owner");

  const populated = await request.populate([
    { path: "property", select: "name address" },
    { path: "requestedBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
  ]);

  const io = req.app.get("io");
  const targets = getNotifyTargets(request, propertyDoc?.owner);
  io.to(targets).emit("maintenance:updated", populated);

  res.json({ success: true, data: populated });
});

// @desc    Assign staff to a maintenance request
// @route   PUT /api/maintenance/:id/assign
// @access  Private (owner/admin)
const assignMaintenanceRequest = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Maintenance request not found");
  }

  const previousAssignee = request.assignedTo ? request.assignedTo.toString() : null;
  request.assignedTo = assignedTo || null;
  await request.save();

  const propertyDoc = await Property.findById(request.property).select("owner");

  const populated = await request.populate([
    { path: "property", select: "name address" },
    { path: "requestedBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
  ]);

  const io = req.app.get("io");
  // Notify the newly assigned staff member (this is the moment they first
  // learn about the request), the requester, the owner, and - if the staff
  // assignment changed - the previously assigned staff member so their view
  // updates too (e.g. it disappears from their list).
  const targets = getNotifyTargets(request, propertyDoc?.owner);
  if (previousAssignee) targets.push(previousAssignee);
  io.to(Array.from(new Set(targets))).emit("maintenance:updated", populated);
  if (assignedTo) {
    io.to(assignedTo.toString()).emit("maintenance:assigned", populated);
  }

  res.json({ success: true, data: populated });
});

module.exports = {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceStatus,
  assignMaintenanceRequest,
};
