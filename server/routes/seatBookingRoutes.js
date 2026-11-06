import express from "express";
import {
  bookSeat,
  getMyBookings,
  cancelBooking,
  completeBooking,
  getLibraryBookings,
  getAllBookings,
  getSeatAvailability,
} from "../controllers/seatBookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Availability query (accessible by authenticated users, before dynamic :id routes)
router.get("/availability", protect, getSeatAvailability);

// Student booking and personal records
router.post("/", protect, authorize("student"), bookSeat);
router.get("/my-bookings", protect, authorize("student"), getMyBookings);

// Booking cancellation (student can cancel own, assigned librarian or admin can cancel)
router.patch("/:id/cancel", protect, cancelBooking);

// Booking completion and check-in (assigned librarian or admin)
router.patch("/:id/complete", protect, authorize("librarian", "admin"), completeBooking);
router.patch("/:id/check-in", protect, authorize("librarian", "admin"), completeBooking);

// Librarian bookings listing
router.get("/library", protect, authorize("librarian"), getLibraryBookings);

// Admin global bookings listing
router.get("/", protect, authorize("admin"), getAllBookings);

export default router;
