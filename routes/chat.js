const express = require("express");
const {
  findUserByEmail,
  getConversations,
  startChat,
  getMessages,
  sendMessage,
} = require("../controllers/chat");
const { protect } = require("../middleware/auth");
const createFileUploadMiddleware = require("../middleware/multer");

const router = express.Router();

router.get("/find-user",          protect, findUserByEmail);
router.get("/conversations",      protect, getConversations);
router.post("/start",             protect, startChat);
router.get("/:userId/messages",   protect, getMessages);
router.post("/:userId/message",   protect, ...createFileUploadMiddleware(), sendMessage);

module.exports = router;
