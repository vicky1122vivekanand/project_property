/**
 * Seed script - populates the database with sample data for demo/testing.
 * Run with: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Property = require("../models/Property");
const Amenity = require("../models/Amenity");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const AmenityBooking = require("../models/AmenityBooking");
const Message = require("../models/Message");
const Feedback = require("../models/Feedback");

const seed = async () => {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany(),
    Property.deleteMany(),
    Amenity.deleteMany(),
    MaintenanceRequest.deleteMany(),
    AmenityBooking.deleteMany(),
    Message.deleteMany(),
    Feedback.deleteMany(),
  ]);

  console.log("Creating property...");
  const property = await Property.create({
    name: "Sunrise Residency",
    address: "123 Palm Avenue, Patna, Bihar",
    description: "A modern residential complex with shared amenities.",
  });

  console.log("Creating users...");
  const owner = await User.create({
    name: "Owner Admin",
    email: "owner@example.com",
    password: "password123",
    role: "owner",
    property: property._id,
  });

  property.owner = owner._id;
  await property.save();

  const staff = await User.create({
    name: "Maintenance Staff",
    email: "staff@example.com",
    password: "password123",
    role: "staff",
    property: property._id,
  });

  const tenant = await User.create({
    name: "Jane Tenant",
    email: "tenant@example.com",
    password: "password123",
    role: "tenant",
    property: property._id,
  });

  console.log("Creating amenities...");
  const gym = await Amenity.create({
    name: "Gym",
    property: property._id,
    description: "Fully equipped fitness center",
    capacity: 5,
    openTime: "06:00",
    closeTime: "22:00",
  });

  const pool = await Amenity.create({
    name: "Swimming Pool",
    property: property._id,
    description: "Outdoor pool",
    capacity: 2,
    openTime: "07:00",
    closeTime: "20:00",
    availabilityStatus: "Unavailable",
    unavailabilityReason: "Closed for seasonal cleaning",
  });

  const hall = await Amenity.create({
    name: "Community Hall",
    property: property._id,
    description: "Event hall for gatherings",
    capacity: 1,
    openTime: "09:00",
    closeTime: "23:00",
  });

  console.log("Creating sample maintenance requests...");
  // Unassigned - sits with the owner until they assign it to staff
  await MaintenanceRequest.create({
    property: property._id,
    requestedBy: tenant._id,
    issueTitle: "Leaking kitchen faucet",
    issueDescription: "The kitchen faucet has been leaking for two days.",
    category: "Plumbing",
    priority: "Medium",
    status: "Pending",
    assignedTo: null,
    statusHistory: [{ status: "Pending", changedBy: tenant._id }],
  });

  // Already assigned to staff - so the staff demo account has something to see
  await MaintenanceRequest.create({
    property: property._id,
    requestedBy: tenant._id,
    issueTitle: "AC not cooling",
    issueDescription: "The bedroom AC unit is running but not cooling the room.",
    category: "HVAC",
    priority: "High",
    status: "In Progress",
    assignedTo: staff._id,
    statusHistory: [
      { status: "Pending", changedBy: tenant._id },
      { status: "In Progress", changedBy: owner._id },
    ],
  });

  // Completed and rated - so the satisfaction KPI has real data to show
  const resolvedRequest = await MaintenanceRequest.create({
    property: property._id,
    requestedBy: tenant._id,
    issueTitle: "Broken doorbell",
    issueDescription: "The doorbell hasn't been working since last week.",
    category: "Electrical",
    priority: "Low",
    status: "Completed",
    assignedTo: staff._id,
    resolutionDate: new Date(),
    statusHistory: [
      { status: "Pending", changedBy: tenant._id },
      { status: "In Progress", changedBy: owner._id },
      { status: "Completed", changedBy: staff._id },
    ],
  });

  console.log("Creating a sample amenity booking...");
  const today = new Date().toISOString().slice(0, 10);
  await AmenityBooking.create({
    amenity: gym._id,
    bookedBy: tenant._id,
    bookingDate: today,
    checkInTime: "17:00",
    checkOutTime: "18:00",
    status: "Booked",
  });

  console.log("Creating sample satisfaction feedback...");
  await Feedback.create({
    property: property._id,
    maintenanceRequest: resolvedRequest._id,
    submittedBy: tenant._id,
    rating: 5,
    comment: "Fixed quickly and the staff member was very courteous. Thank you!",
  });

  console.log("Creating sample private messages...");
  await Message.create([
    {
      property: property._id,
      sender: tenant._id,
      receiver: owner._id,
      text: "Hi, just wanted to flag the kitchen faucet issue I raised.",
    },
    {
      property: property._id,
      sender: owner._id,
      receiver: tenant._id,
      text: "Thanks for letting me know, I've assigned our staff to take a look.",
    },
    {
      property: property._id,
      sender: owner._id,
      receiver: staff._id,
      text: "Can you check out the kitchen faucet leak in Jane's unit today?",
    },
  ]);

  console.log("\nSeed complete! Sample login credentials:");
  console.log("  Owner: owner@example.com / password123");
  console.log("  Staff: staff@example.com / password123");
  console.log("  Tenant: tenant@example.com / password123");

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
