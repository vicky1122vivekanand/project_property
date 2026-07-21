const express = require("express");
const { getConversations, getConversation, sendMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.get("/:partnerId", protect, getConversation);
router.post("/", protect, sendMessage);

module.exports = router;
