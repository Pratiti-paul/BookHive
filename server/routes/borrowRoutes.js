import express from "express";
import {
  issueBook,
  returnBook,
  renewBook,
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

export default router;