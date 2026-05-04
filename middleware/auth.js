const jwt  = require("jsonwebtoken");
const User = require("../models/user");

// ── 1. Protect — checks if user is logged in ──────────────
const protect = async (req, res, next) => {
  try {
    // ── get token from header ────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    // ── verify token ─────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── find user from token ─────────────────────────────
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // ── check account is active ──────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
      });
    }

    // ── attach user to request ───────────────────────────
    req.user = user;
    next();

  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ── 2. Authorize roles ────────────────────────────────────
// usage: authorizeRoles("admin", "moderator")
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Allowed roles: ${roles.join(", ")}`,
    });
  }
  next();
};

// ── 3. Optional auth ──────────────────────────────────────
// use on routes that work for both logged in and guest users
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next(); // continue without user
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

    req.user = user || null;
    next();

  } catch {
    req.user = null;
    next(); // even if token is bad — continue as guest
  }
};

module.exports = { protect, authorizeRoles, optionalAuth };