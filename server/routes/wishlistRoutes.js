import express from "express";
import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
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

router.delete(
  "/:bookId",
  protect,
  authorize("student"),
  removeFromWishlist
);

export default router;