const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Property = require("../models/Property");
const generateToken = require("../utils/generateToken");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, propertyId, propertyName, propertyAddress } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  let property = null;

  // Owners can create a new property on registration
  if (role === "owner" && propertyName && propertyAddress) {
    property = await Property.create({
      name: propertyName,
      address: propertyAddress,
      owner: null, // set after user creation
    });
  } else if (propertyId) {
    property = await Property.findById(propertyId);
    if (!property) {
      res.status(400);
      throw new Error("Selected property does not exist");
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "tenant",
    phone,
    property: property ? property._id : undefined,
  });

  if (property && role === "owner") {
    property.owner = user._id;
    await property.save();
  }

  res.status(201).json({
    success: true,
    user: user.toSafeObject(),
    token: generateToken(user._id),
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      success: true,
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
});

module.exports = { registerUser, loginUser, getMe };
