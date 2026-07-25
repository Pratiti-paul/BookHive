import express from "express";
import {
  issueBook,
  returnBook,
  renewBook,
  getMyBorrowedBooks,
} from "../controllers/borrowController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  issueBook
);

router.put(
  "/:borrowId/return",
  protect,
  authorize("admin", "librarian"),
  returnBook
);

router.put(
  "/:borrowId/renew",
  protect,
  authorize("admin", "librarian"),
  renewBook
);

router.get(
  "/my-books",
  protect,
  authorize("student"),
  getMyBorrowedBooks
);

export default router;