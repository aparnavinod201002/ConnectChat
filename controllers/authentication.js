const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ── Login ─────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
console.log("inside");

    // ── 1. Check required fields ──────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ── 2. Find user — include password for comparison ────
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // never reveal which is wrong
      });
    }

    // ── 3. Check if account is active ────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
      });
    }

    // ── 4. Compare password ───────────────────────────────
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // same message for security
      });
    }

    // ── 5. Generate JWT ───────────────────────────────────
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ── 6. Send response ──────────────────────────────────
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });

  } catch (error) {
        console.error("LOGIN ERROR:", error); // 👈 this shows FULL error in terminal
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = { login };
