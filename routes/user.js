const express = require("express");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
} = require("../controllers/user");
const createFileUploadMiddleware = require("../middleware/multer");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id/password", protect, changePassword);
router.put("/:id", protect, createFileUploadMiddleware(), updateUser);
router.delete("/:id", protect, deleteUser);

module.exports = router;
