import express from "express";
import {
  register,
  login,
} from "../controllers/authController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================
// Public Routes
// =========================
router.post("/register", register);
router.post("/login", login);

// =========================
// Protected Routes
// =========================

// Get Logged-in User Profile
router.get("/profile", protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// Student Only
router.get(
  "/student",
  protect,
  authorize("student"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Student!",
      user: req.user,
    });
  }
);

// Librarian Only
router.get(
  "/librarian",
  protect,
  authorize("librarian"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Librarian!",
      user: req.user,
    });
  }
);

// Admin Only
router.get(
  "/admin",
  protect,
  authorize("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin!",
      user: req.user,
    });
  }
);

export default router;