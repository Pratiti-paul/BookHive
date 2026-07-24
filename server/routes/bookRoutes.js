import express from "express";
import {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getAllBooks);
router.get("/:id", getBookById);

// Librarian/Admin
router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  createBook
);

router.put(
  "/:id",
  protect,
  authorize("librarian", "admin"),
  updateBook
);

router.delete(
  "/:id",
  protect,
  authorize("librarian", "admin"),
  deleteBook
);

export default router;