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
const cors = require("cors");

const allowedOrigins = [
  process.env.FRONTEND_URL        // production frontend URL
].filter(Boolean);                 // remove undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman / server-to-server (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,             // if you use cookies or auth headers
  })
);
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
