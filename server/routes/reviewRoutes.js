import express from "express";
import {
  createReview,
  getBookReviews,
} from "../controllers/reviewController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("student"),
  createReview
);

router.get(
  "/book/:bookId",
  protect,
  getBookReviews
);

export default router;