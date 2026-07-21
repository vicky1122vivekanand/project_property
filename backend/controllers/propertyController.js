const asyncHandler = require("express-async-handler");
const Property = require("../models/Property");

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find().populate("owner", "name email");
  res.json({ success: true, data: properties });
});

// @desc    Create a property
// @route   POST /api/properties
// @access  Private (owner/admin)
const createProperty = asyncHandler(async (req, res) => {
  const { name, address, unit, description } = req.body;

  if (!name || !address) {
    res.status(400);
    throw new Error("Name and address are required");
  }

  const property = await Property.create({
    name,
    address,
    unit,
    description,
    owner: req.user._id,
  });

  res.status(201).json({ success: true, data: property });
});

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate("owner", "name email");
  if (!property) {
    res.status(404);
    throw new Error("Property not found");
  }
  res.json({ success: true, data: property });
});

// @desc    Update a property (only its owner or admin)
// @route   PUT /api/properties/:id
// @access  Private (owner/admin)
const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error("Property not found");
  }

  const isOwnerOfThisProperty = property.owner && property.owner.toString() === req.user._id.toString();
  if (!isOwnerOfThisProperty && req.user.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to edit this property");
  }

  const { name, address, unit, description } = req.body;
  if (name !== undefined) property.name = name;
  if (address !== undefined) property.address = address;
  if (unit !== undefined) property.unit = unit;
  if (description !== undefined) property.description = description;

  await property.save();

  const populated = await property.populate("owner", "name email");
  res.json({ success: true, data: populated });
});

module.exports = { getProperties, createProperty, getPropertyById, updateProperty };
