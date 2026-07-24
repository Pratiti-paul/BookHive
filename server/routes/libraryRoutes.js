import express from "express";
import {
  createLibrary,
  getLibraries,
  getLibraryById,
  updateLibrary,
  deleteLibrary,
  assignLibrarian,
} from "../controllers/libraryController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getLibraries)
  .post(protect, authorize("admin"), createLibrary);

router
  .route("/:id")
  .get(getLibraryById)
  .put(protect, authorize("admin"), updateLibrary)
  .delete(protect, authorize("admin"), deleteLibrary);

router.put(
  "/:libraryId/assign/:userId",
  protect,
  authorize("admin"),
  assignLibrarian
);

export default router;