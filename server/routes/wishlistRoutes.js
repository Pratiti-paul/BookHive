import express from "express";
import { addToWishlist } from "../controllers/wishlistController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/:bookId",
  protect,
  authorize("student"),
  addToWishlist
);

export default router;