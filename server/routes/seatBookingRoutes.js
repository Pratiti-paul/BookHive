import express from "express";
import { bookSeat } from "../controllers/seatBookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("student"),
  bookSeat
);

export default router;