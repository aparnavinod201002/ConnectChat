const User = require("../models/user");
const bcrypt = require("bcryptjs");

const isSameUser = (req) => String(req.user?._id) === String(req.params.id);

// CREATE user
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
console.log("new");


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
    });

    res.status(201).json({
      message: "User created successfully",
      data: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("-__v");
    res.status(200).json({ data: users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET single user
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// UPDATE user
const updateUser = async (req, res) => {
  try {
    if (!isSameUser(req)) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    const updates = { ...req.body };
    delete updates.password;
    delete updates.role;
    delete updates.isActive;
    delete updates.isEmailVerified;

    if (req.fileData?.image) {
      updates.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.fileData.image}`;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User updated", data: user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// CHANGE password
const changePassword = async (req, res) => {
  try {
    if (!isSameUser(req)) {
      return res.status(403).json({ message: "You can only change your own password" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// DELETE user (soft delete)
const deleteUser = async (req, res) => {
  try {
    if (!isSameUser(req)) {
      return res.status(403).json({ message: "You can only deactivate your own account" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, changePassword, deleteUser };
