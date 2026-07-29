import express from "express";
import {
  bookSeat,
  getMyBookings,
  cancelBooking,
  getLibraryBookings,
  getAllBookings,
} from "../controllers/seatBookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("student"),
  bookSeat
);

router.get(
  "/my-bookings",
  protect,
  authorize("student"),
  getMyBookings
);

router.patch(
  "/:id/cancel",
  protect,
  authorize("student"),
  cancelBooking
);

router.get(
    "/library",
    protect,
    authorize("librarian"),
    getLibraryBookings
);

router.get(
  "/",
  protect,
  authorize("admin"),
  getAllBookings
);

export default router;