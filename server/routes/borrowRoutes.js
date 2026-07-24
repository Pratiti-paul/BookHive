import express from "express";
import { issueBook } from "../controllers/borrowController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  issueBook
);

export default router;