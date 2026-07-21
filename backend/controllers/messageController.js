const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");

const OWNER_ROLES = ["owner", "admin"];
const OTHER_ROLES = ["tenant", "staff"];

// A chat pair is only valid between the property owner/admin and one of
// their tenants or staff, on the same property. This deliberately blocks
// tenant<->tenant, staff<->staff, and tenant<->staff conversations.
const isValidPair = (userA, userB) => {
  if (!userA.property || !userB.property) return false;
  if (userA.property.toString() !== userB.property.toString()) return false;

  return (
    (OWNER_ROLES.includes(userA.role) && OTHER_ROLES.includes(userB.role)) ||
    (OWNER_ROLES.includes(userB.role) && OTHER_ROLES.includes(userA.role))
  );
};

// @desc    Get the list of people the current user is allowed to message
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  let contacts = [];

  if (OWNER_ROLES.includes(req.user.role)) {
    // Owner/admin can message every tenant and staff member on their property
    contacts = await User.find({
      property: req.user.property,
      role: { $in: OTHER_ROLES },
    }).select("name email role");
  } else {
    // Tenants/staff can only message the property owner/admin
    contacts = await User.find({
      property: req.user.property,
      role: { $in: OWNER_ROLES },
    }).select("name email role");
  }

  res.json({ success: true, data: contacts });
});

// @desc    Get message history with one specific person
// @route   GET /api/messages/:partnerId
// @access  Private
const getConversation = asyncHandler(async (req, res) => {
  const partner = await User.findById(req.params.partnerId);
  if (!partner) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!isValidPair(req.user, partner)) {
    res.status(403);
    throw new Error("You are not allowed to view this conversation");
  }

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: partner._id },
      { sender: partner._id, receiver: req.user._id },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("sender", "name role")
    .populate("receiver", "name role");

  // Mark incoming messages as read now that this user has opened the thread
  await Message.updateMany(
    { sender: partner._id, receiver: req.user._id, readAt: null },
    { readAt: new Date() }
  );

  res.json({ success: true, data: messages });
});

// @desc    Send a direct message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { receiver, text } = req.body;

  if (!receiver || !text || !text.trim()) {
    res.status(400);
    throw new Error("Receiver and message text are required");
  }

  const receiverUser = await User.findById(receiver);
  if (!receiverUser) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  if (!isValidPair(req.user, receiverUser)) {
    res.status(403);
    throw new Error("Direct messages are only allowed between an owner and their own tenants/staff");
  }

  const message = await Message.create({
    property: req.user.property,
    sender: req.user._id,
    receiver: receiverUser._id,
    text: text.trim(),
  });

  const populated = await message.populate([
    { path: "sender", select: "name role" },
    { path: "receiver", select: "name role" },
  ]);

  const io = req.app.get("io");
  // Deliver only to the two participants' private socket rooms -
  // no other connected user ever receives this event.
  io.to(req.user._id.toString()).to(receiverUser._id.toString()).emit("message:new", populated);

  res.status(201).json({ success: true, data: populated });
});

module.exports = { getConversations, getConversation, sendMessage };
