import express from "express";
import {
  createSeat,
  getLibrarySeats,
  updateSeat,
  deleteSeat,
  configureBulkLayout,
} from "../controllers/seatController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bulk / grid layout configuration
router.post(
  "/layout",
  protect,
  authorize("librarian", "admin"),
  configureBulkLayout
);

// Retrieve seating arrangement for a library (students, librarians, admins)
router.get(
  "/library/:libraryId",
  protect,
  getLibrarySeats
);

// Create single or batch seats
router.post(
  "/",
  protect,
  authorize("librarian", "admin"),
  createSeat
);

// Update a seat
router.put(
  "/:id",
  protect,
  authorize("librarian", "admin"),
  updateSeat
);

// Delete or deactivate a seat
router.delete(
  "/:id",
  protect,
  authorize("librarian", "admin"),
  deleteSeat
);

export default router;

