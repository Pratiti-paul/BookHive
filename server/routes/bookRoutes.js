import express from "express";
import { createBook } from "../controllers/bookController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Librarian & Admin can add books
router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  createBook
);

export default router;