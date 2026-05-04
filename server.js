const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

// routes
 const userRoutes = require("./routes/user");
const authRoutes = require("./routes/autentication");
const chatRoutes = require("./routes/chat");

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Database ─────────────────────────────────────────────────
connectDB();

// ─── Routes ───────────────────────────────────────────────────
 app.use("/users", userRoutes);
 app.use("/auth", authRoutes);
 app.use("/chat", chatRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Server is running 🚀" });
});

// ─── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
