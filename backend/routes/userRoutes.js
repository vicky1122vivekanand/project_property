const express = require("express");
const { getUsers } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, authorize("owner", "admin"), getUsers);

module.exports = router;
