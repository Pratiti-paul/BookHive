import express from "express";
import {
  issueBook,
  returnBook,
  renewBook,
  getMyBorrowedBooks,
  getAllBorrowRecords,
  getOverdueBooks,
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
  "/overdue",
  protect,
  authorize("admin", "librarian"),
  getOverdueBooks
);

router.get(
  "/my-books",
  protect,
  authorize("student"),
  getMyBorrowedBooks
);

router.get(
  "/",
  protect,
  authorize("admin", "librarian"),
  getAllBorrowRecords
);

export default router;