const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    // One rating per completed maintenance request - enforced via the
    // unique index below as well as a duplicate check in the controller.
    maintenanceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceRequest",
      required: true,
      unique: true,
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

feedbackSchema.index({ property: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
