import mongoose from "mongoose";
import Seat from "../models/Seat.js";
import Library from "../models/Library.js";
import SeatBooking from "../models/SeatBooking.js";

/**
 * Reusable helper to keep Library.seatCount in sync with active Seat count.
 */
export const syncLibrarySeatCount = async (libraryId) => {
  try {
    const activeCount = await Seat.countDocuments({
      library: libraryId,
      isActive: true,
    });

    await Library.findByIdAndUpdate(libraryId, {
      seatCount: activeCount,
    });

    return activeCount;
  } catch (err) {
    console.error("Error syncing library seat count:", err?.message || err);
    return null;
  }
};

// @desc    Create a new seat (or batch of seats)
// @route   POST /api/seats
// @access  Private (Librarian/Admin)
export const createSeat = async (req, res) => {
  try {
    const { seats, libraryId: bodyLibId, library: bodyLibRef } = req.body;

    // Resolve target library based on user role and multi-tenancy
    let targetLibraryId;
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }
      const requestedLib = bodyLibId || bodyLibRef || req.body.seats?.[0]?.library;
      if (requestedLib && requestedLib.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot create seats for another library.",
        });
      }
      targetLibraryId = req.user.library;
    } else if (req.user.role === "admin") {
      targetLibraryId = bodyLibId || bodyLibRef || req.body.seats?.[0]?.library;
      if (!targetLibraryId) {
        return res.status(400).json({
          success: false,
          message: "Library ID is required for seat creation.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create seats.",
      });
    }

    const libraryDoc = await Library.findById(targetLibraryId);
    if (!libraryDoc) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    // Handle batch creation if 'seats' array is provided
    if (Array.isArray(seats) && seats.length > 0) {
      const createdSeats = [];
      const errors = [];

      for (let i = 0; i < seats.length; i++) {
        const item = seats[i];
        const trimmedNumber = item.seatNumber ? String(item.seatNumber).trim() : "";
        const numRow = Number(item.row);
        const numCol = Number(item.column);
        const seatType = item.type ? String(item.type).toLowerCase().trim() : "regular";

        if (!trimmedNumber || isNaN(numRow) || numRow < 1 || isNaN(numCol) || numCol < 1) {
          errors.push(`Seat at index ${i} has invalid seatNumber, row, or column.`);
          continue;
        }

        // Check for duplicates
        const existingNumber = await Seat.findOne({
          library: targetLibraryId,
          seatNumber: trimmedNumber,
        });
        if (existingNumber) {
          errors.push(`Seat number "${trimmedNumber}" already exists in this library.`);
          continue;
        }

        const existingPos = await Seat.findOne({
          library: targetLibraryId,
          row: numRow,
          column: numCol,
        });
        if (existingPos) {
          errors.push(`A seat already exists at row ${numRow}, column ${numCol}.`);
          continue;
        }

        const newSeat = await Seat.create({
          library: targetLibraryId,
          seatNumber: trimmedNumber,
          row: numRow,
          column: numCol,
          type: seatType,
          isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
        });

        createdSeats.push(newSeat);
      }

      await syncLibrarySeatCount(targetLibraryId);

      return res.status(201).json({
        success: true,
        message: `Created ${createdSeats.length} seats.${errors.length > 0 ? ` Skipped ${errors.length} invalid entries.` : ""}`,
        count: createdSeats.length,
        seats: createdSeats,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Handle single seat creation
    const { seatNumber, row, column, type = "regular", isActive = true } = req.body;
    const trimmedNumber = seatNumber ? String(seatNumber).trim() : "";
    const numRow = Number(row);
    const numCol = Number(column);

    if (!trimmedNumber || isNaN(numRow) || numRow < 1 || isNaN(numCol) || numCol < 1) {
      return res.status(400).json({
        success: false,
        message: "Seat number, valid row (>=1) and valid column (>=1) are required.",
      });
    }

    // Validate seat type enum
    const validTypes = ["regular", "window", "premium", "accessible"];
    const normalizedType = String(type).toLowerCase().trim();
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid seat type "${type}". Allowed types: ${validTypes.join(", ")}.`,
      });
    }

    // Check duplicate seat number within this library
    const existingNumber = await Seat.findOne({
      library: targetLibraryId,
      seatNumber: trimmedNumber,
    });
    if (existingNumber) {
      return res.status(400).json({
        success: false,
        message: `Seat number "${trimmedNumber}" already exists in this library.`,
      });
    }

    // Check duplicate row/column position within this library
    const existingPos = await Seat.findOne({
      library: targetLibraryId,
      row: numRow,
      column: numCol,
    });
    if (existingPos) {
      return res.status(400).json({
        success: false,
        message: `A seat already exists at row ${numRow}, column ${numCol} in this library.`,
      });
    }

    const seat = await Seat.create({
      library: targetLibraryId,
      seatNumber: trimmedNumber,
      row: numRow,
      column: numCol,
      type: normalizedType,
      isActive: Boolean(isActive),
    });

    await syncLibrarySeatCount(targetLibraryId);

    res.status(201).json({
      success: true,
      message: "Seat created successfully.",
      seat,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate seat number or position detected for this library.",
      });
    }
    console.error("createSeat error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Retrieve the seating arrangement for a library
// @route   GET /api/seats/library/:libraryId
// @access  Private (All authenticated users: student, librarian, admin)
export const getLibrarySeats = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { isActive, type } = req.query;

    const library = await Library.findById(libraryId).select(
      "name city address seatCount openingHours"
    );
    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    const query = { library: libraryId };
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (type) {
      query.type = String(type).toLowerCase().trim();
    }

    const seats = await Seat.find(query).sort({
      row: 1,
      column: 1,
      seatNumber: 1,
    });

    res.status(200).json({
      success: true,
      count: seats.length,
      library,
      seats,
    });
  } catch (error) {
    console.error("getLibrarySeats error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update a seat
// @route   PUT /api/seats/:id
// @access  Private (Librarian/Admin)
export const updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatNumber, row, column, type, isActive } = req.body;

    const seat = await Seat.findById(id);
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: "Seat not found.",
      });
    }

    // Role and library multi-tenancy verification
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (seat.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot update seats belonging to another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update seats.",
      });
    }

    // Validate and check duplicate seatNumber if changing
    if (seatNumber !== undefined) {
      const trimmedNumber = String(seatNumber).trim();
      if (!trimmedNumber) {
        return res.status(400).json({
          success: false,
          message: "Seat number cannot be empty.",
        });
      }

      if (trimmedNumber !== seat.seatNumber) {
        const duplicateNumber = await Seat.findOne({
          library: seat.library,
          seatNumber: trimmedNumber,
          _id: { $ne: seat._id },
        });
        if (duplicateNumber) {
          return res.status(400).json({
            success: false,
            message: `Seat number "${trimmedNumber}" already exists in this library.`,
          });
        }
        seat.seatNumber = trimmedNumber;
      }
    }

    // Validate and check position if changing row or column
    const newRow = row !== undefined ? Number(row) : seat.row;
    const newCol = column !== undefined ? Number(column) : seat.column;

    if (row !== undefined || column !== undefined) {
      if (isNaN(newRow) || newRow < 1 || isNaN(newCol) || newCol < 1) {
        return res.status(400).json({
          success: false,
          message: "Row and column must be integers greater than or equal to 1.",
        });
      }

      if (newRow !== seat.row || newCol !== seat.column) {
        const duplicatePos = await Seat.findOne({
          library: seat.library,
          row: newRow,
          column: newCol,
          _id: { $ne: seat._id },
        });
        if (duplicatePos) {
          return res.status(400).json({
            success: false,
            message: `A seat already exists at row ${newRow}, column ${newCol} in this library.`,
          });
        }
        seat.row = newRow;
        seat.column = newCol;
      }
    }

    // Validate type if updating
    if (type !== undefined) {
      const validTypes = ["regular", "window", "premium", "accessible"];
      const normalizedType = String(type).toLowerCase().trim();
      if (!validTypes.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid seat type "${type}". Allowed types: ${validTypes.join(", ")}.`,
        });
      }
      seat.type = normalizedType;
    }

    // Update active status
    if (isActive !== undefined) {
      seat.isActive = Boolean(isActive);
    }

    await seat.save();
    await syncLibrarySeatCount(seat.library);

    res.status(200).json({
      success: true,
      message: "Seat updated successfully.",
      seat,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate seat number or position detected for this library.",
      });
    }
    console.error("updateSeat error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete a seat (with active booking safety and historical integrity)
// @route   DELETE /api/seats/:id
// @access  Private (Librarian/Admin)
export const deleteSeat = async (req, res) => {
  try {
    const { id } = req.params;

    const seat = await Seat.findById(id);
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: "Seat not found.",
      });
    }

    // Multi-tenancy check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (seat.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot delete seats belonging to another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete seats.",
      });
    }

    // Check for active bookings: cannot delete if currently booked
    const activeBooking = await SeatBooking.findOne({
      seat: seat._id,
      status: "Booked",
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete seat with active bookings. Please wait until reservations complete or are cancelled.",
      });
    }

    // Check for historical bookings: if records exist, deactivate to preserve audit history
    const historicalBooking = await SeatBooking.findOne({
      seat: seat._id,
    });

    if (historicalBooking) {
      seat.isActive = false;
      await seat.save();
      await syncLibrarySeatCount(seat.library);

      return res.status(200).json({
        success: true,
        message: "Seat has historical booking records and was deactivated instead of permanently deleted to preserve data integrity.",
        deactivated: true,
        seat,
      });
    }

    // No booking references at all: safe to permanently remove
    const libraryId = seat.library;
    await seat.deleteOne();
    await syncLibrarySeatCount(libraryId);

    res.status(200).json({
      success: true,
      message: "Seat deleted successfully.",
      deleted: true,
    });
  } catch (error) {
    console.error("deleteSeat error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Configure a bulk seating grid layout for a library
// @route   POST /api/seats/layout
// @access  Private (Librarian/Admin)
export const configureBulkLayout = async (req, res) => {
  try {
    const {
      libraryId: bodyLibId,
      library: bodyLibRef,
      rows,
      columns,
      prefix = "S",
      type = "regular",
      replaceExisting = false,
    } = req.body;

    let targetLibraryId;
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }
      const requested = bodyLibId || bodyLibRef;
      if (requested && requested.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot configure seating for another library.",
        });
      }
      targetLibraryId = req.user.library;
    } else if (req.user.role === "admin") {
      targetLibraryId = bodyLibId || bodyLibRef;
      if (!targetLibraryId) {
        return res.status(400).json({
          success: false,
          message: "Library ID is required to configure layout.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to configure seating layout.",
      });
    }

    const libraryDoc = await Library.findById(targetLibraryId);
    if (!libraryDoc) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    const numRows = Number(rows);
    const numCols = Number(columns);

    if (isNaN(numRows) || numRows < 1 || numRows > 50) {
      return res.status(400).json({
        success: false,
        message: "Rows must be a valid integer between 1 and 50.",
      });
    }

    if (isNaN(numCols) || numCols < 1 || numCols > 50) {
      return res.status(400).json({
        success: false,
        message: "Columns must be a valid integer between 1 and 50.",
      });
    }

    if (numRows * numCols > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum layout capacity exceeded (1000 seats maximum).",
      });
    }

    const validTypes = ["regular", "window", "premium", "accessible"];
    const normalizedType = String(type).toLowerCase().trim();
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid seat type "${type}". Allowed: ${validTypes.join(", ")}.`,
      });
    }

    // Load existing seats for the target library
    const existingSeats = await Seat.find({ library: targetLibraryId });
    const posMap = new Map();
    const numMap = new Map();

    existingSeats.forEach((s) => {
      posMap.set(`${s.row}_${s.column}`, s);
      numMap.set(s.seatNumber, s);
    });

    const cleanPrefix = prefix ? String(prefix).trim() : "S";
    let createdCount = 0;
    let updatedCount = 0;

    // Generate grid seats
    for (let r = 1; r <= numRows; r++) {
      for (let c = 1; c <= numCols; c++) {
        const posKey = `${r}_${c}`;
        const defaultSeatNumber = `${cleanPrefix}-${r}-${c}`;

        if (posMap.has(posKey)) {
          const existing = posMap.get(posKey);
          if (!existing.isActive) {
            existing.isActive = true;
            await existing.save();
            updatedCount++;
          }
        } else {
          // Determine unique seat number
          let finalNumber = defaultSeatNumber;
          let counter = 1;
          while (numMap.has(finalNumber)) {
            finalNumber = `${defaultSeatNumber}-${counter}`;
            counter++;
          }

          const created = await Seat.create({
            library: targetLibraryId,
            seatNumber: finalNumber,
            row: r,
            column: c,
            type: normalizedType,
            isActive: true,
          });

          posMap.set(posKey, created);
          numMap.set(finalNumber, created);
          createdCount++;
        }
      }
    }

    // If replaceExisting is true, deactivate unbooked seats outside the new boundary
    if (replaceExisting) {
      for (const s of existingSeats) {
        if (s.row > numRows || s.column > numCols) {
          const activeBooking = await SeatBooking.findOne({
            seat: s._id,
            status: "Booked",
          });
          if (!activeBooking) {
            s.isActive = false;
            await s.save();
          }
        }
      }
    }

    const activeTotal = await syncLibrarySeatCount(targetLibraryId);

    const allSeats = await Seat.find({
      library: targetLibraryId,
      isActive: true,
    }).sort({ row: 1, column: 1, seatNumber: 1 });

    res.status(201).json({
      success: true,
      message: `Layout successfully configured with ${activeTotal} active seats (${createdCount} created, ${updatedCount} reactivated).`,
      layout: {
        rows: numRows,
        columns: numCols,
        totalSeats: activeTotal,
      },
      seats: allSeats,
    });
  } catch (error) {
    console.error("configureBulkLayout error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

