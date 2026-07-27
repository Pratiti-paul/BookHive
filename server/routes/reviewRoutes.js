import express from "express";
import {
  createReview,
  getBookReviews,
  getMyReviews,
  updateReview,
  deleteReview,
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

router.get(
  "/my-reviews",
  protect,
  getMyReviews
);

router.put(
  "/:id",
  protect,
  authorize("student"),
  updateReview
);

router.delete(
  "/:id",
  protect,
  authorize("student"),
  deleteReview
);

export default router;