const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    issueTitle: { type: String, required: true, trim: true },
    issueDescription: { type: String, required: true },
    category: {
      type: String,
      enum: ["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    resolutionDate: { type: Date, default: null },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

// Speeds up the most common queries: filtering by property/status, a
// tenant's own requests, and a staff member's assigned requests - all part
// of keeping response times under the ≤ 2s KPI as data grows.
maintenanceRequestSchema.index({ property: 1, status: 1 });
maintenanceRequestSchema.index({ requestedBy: 1 });
maintenanceRequestSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
