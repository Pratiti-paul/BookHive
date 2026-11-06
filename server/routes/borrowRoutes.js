import express from "express";
import {
  requestBorrow,
  getBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  requestRenewal,
  approveRenewalRequest,
  rejectRenewalRequest,
  issueBook,
  returnBook,
  renewBook,
  getMyBorrowedBooks,
  getAllBorrowRecords,
  getOverdueBooks,
} from "../controllers/borrowController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// STUDENT WORKFLOW ROUTES
// ==========================================

// Student submits request to borrow a book
router.post(
  "/request",
  protect,
  authorize("student"),
  requestBorrow
);

// Student submits renewal request for an active loan
router.put(
  "/:borrowId/request-renewal",
  protect,
  authorize("student"),
  requestRenewal
);

// Student views all their own borrowings and requests
router.get(
  "/my-books",
  protect,
  authorize("student"),
  getMyBorrowedBooks
);

// ==========================================
// LIBRARIAN & ADMIN REQUEST MANAGEMENT ROUTES
// ==========================================

// List borrow requests (pending by default)
router.get(
  "/requests",
  protect,
  authorize("librarian", "admin"),
  getBorrowRequests
);

// Approve a pending borrow request
router.put(
  "/requests/:borrowId/approve",
  protect,
  authorize("librarian", "admin"),
  approveBorrowRequest
);

// Reject a pending borrow request
router.put(
  "/requests/:borrowId/reject",
  protect,
  authorize("librarian", "admin"),
  rejectBorrowRequest
);

// Approve a pending renewal request
router.put(
  "/renewals/:borrowId/approve",
  protect,
  authorize("librarian", "admin"),
  approveRenewalRequest
);

// Reject a pending renewal request
router.put(
  "/renewals/:borrowId/reject",
  protect,
  authorize("librarian", "admin"),
  rejectRenewalRequest
);

// ==========================================
// STANDARD LOAN MANAGEMENT (RETURN, OVERDUE, ISSUE)
// ==========================================

// Return a book
router.put(
  "/:borrowId/return",
  protect,
  authorize("admin", "librarian"),
  returnBook
);

// Direct manual renewal by librarian
router.put(
  "/:borrowId/renew",
  protect,
  authorize("admin", "librarian"),
  renewBook
);

// View overdue books
router.get(
  "/overdue",
  protect,
  authorize("admin", "librarian"),
  getOverdueBooks
);

// Direct book issue (walk-in checkout)
router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  issueBook
);

// View all borrow records
router.get(
  "/",
  protect,
  authorize("admin", "librarian"),
  getAllBorrowRecords
);

export default router;
