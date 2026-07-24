import express from "express";
import { createLibrary } from "../controllers/libraryController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin only
router.post("/", protect, authorize("admin"), createLibrary);

export default router;