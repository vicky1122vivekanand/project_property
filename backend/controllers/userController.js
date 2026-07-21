const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @desc    Get users, optionally filtered by role and/or property
// @route   GET /api/users
// @access  Private (owner/admin)
const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const { role, property } = req.query;

  if (role) filter.role = role;
  if (property) filter.property = property;

  const users = await User.find(filter).select("-password").sort({ name: 1 });
  res.json({ success: true, data: users });
});

module.exports = { getUsers };
