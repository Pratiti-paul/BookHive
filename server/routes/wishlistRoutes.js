import express from "express";
import {
  addToWishlist,
  getMyWishlist,
} from "../controllers/wishlistController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/:bookId",
  protect,
  authorize("student"),
  addToWishlist
);

router.get(
  "/",
  protect,
  authorize("student"),
  getMyWishlist
);

router.post(
  "/:bookId",
  protect,
  authorize("student"),
  addToWishlist
);

export default router;