import SeatBooking from "../models/SeatBooking.js";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import createNotification from "../utils/createNotification.js";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Checks whether two time intervals overlap.
 * Intervals [startA, endA) and [startB, endB) overlap if and only if
 * startA < endB and endA > startB.
 */
export const isTimeOverlap = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && endA > startB;
};

/**
 * Normalizes a date into a YYYY-MM-DD string for safe date matching.
 */
const normalizeDateString = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
};

/**
 * Reusable helper to check if a specific seat is available for a given date and time window.
 */
export const checkSeatAvailability = async (
  seatId,
  date,
  startTime,
  endTime,
  excludeBookingId = null
) => {
  const reqDateStr = normalizeDateString(date);
  if (!reqDateStr) return false;

  const d = new Date(date);
  const startOfDay = new Date(d);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(d);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const query = {
    seat: seatId,
    status: { $in: ["Booked", "booked"] },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBookings = await SeatBooking.find(query);

  const hasOverlap = existingBookings.some((b) => {
    if (excludeBookingId && b._id && b._id.toString() === excludeBookingId.toString()) {
      return false;
    }
    const status = b.status ? b.status.toLowerCase() : "";
    if (status !== "booked") return false;

    const bDateStr = normalizeDateString(b.date);
    if (bDateStr && bDateStr !== reqDateStr) return false;

    return isTimeOverlap(b.startTime, b.endTime, startTime, endTime);
  });

  return !hasOverlap;
};

/**
 * Student books an individual seat or a legacy general seat slot.
 * POST /api/seat-bookings
 */
export const bookSeat = async (req, res) => {
  try {
    const { libraryId, seatId, date, startTime, endTime } = req.body;

    if (!libraryId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Validate time format (HH:mm 24-hour)
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Time must be in HH:mm 24-hour format.",
      });
    }

    // Validate that startTime is strictly before endTime
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "Start time must be earlier than end time.",
      });
    }

    // Validate booking date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format.",
      });
    }

    // Prevent booking dates in the past (comparing calendar days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(bookingDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot book a seat for a past date.",
      });
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    if (library.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "This library is currently inactive.",
      });
    }

    const reqDateStr = normalizeDateString(date);

    // =========================================================================
    // CASE 1: Individual Seat Reservation (seatId provided)
    // =========================================================================
    if (seatId) {
      const seat = await Seat.findById(seatId);
      if (!seat) {
        return res.status(404).json({
          success: false,
          message: "Seat not found.",
        });
      }

      if (seat.library.toString() !== libraryId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Seat does not belong to the selected library.",
        });
      }

      if (!seat.isActive) {
        return res.status(400).json({
          success: false,
          message: "This seat is currently inactive.",
        });
      }

      // Check if the seat is already reserved for this date and time interval
      const isAvailable = await checkSeatAvailability(seatId, date, startTime, endTime);
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          message: "Seat is already reserved for the selected time interval.",
        });
      }

      // Check if student already has an overlapping active booking on this date
      const studentBookings = await SeatBooking.find({
        student: req.user._id,
        status: { $in: ["Booked", "booked"] },
      });

      const studentHasOverlap = studentBookings.some((b) => {
        const status = b.status ? b.status.toLowerCase() : "";
        if (status !== "booked") return false;
        const bDateStr = normalizeDateString(b.date);
        if (bDateStr !== reqDateStr) return false;
        return isTimeOverlap(b.startTime, b.endTime, startTime, endTime);
      });

      if (studentHasOverlap) {
        return res.status(400).json({
          success: false,
          message: "You already have an active seat reservation during this time interval.",
        });
      }

      // Concurrency serialization: atomically bump reservationVersion on Seat
      if (typeof Seat.findOneAndUpdate === "function") {
        await Seat.findOneAndUpdate({ _id: seatId }, { $inc: { reservationVersion: 1 } });
      }

      // Create the seat booking
      const booking = await SeatBooking.create({
        student: req.user._id,
        library: libraryId,
        seat: seatId,
        date: bookingDate,
        startTime,
        endTime,
        status: "Booked",
      });

      // Post-insert concurrency verification to prevent race conditions
      const concurrentBookings = await SeatBooking.find({
        seat: seatId,
        status: { $in: ["Booked", "booked"] },
      });

      const conflicts = concurrentBookings.filter((b) => {
        const bDateStr = normalizeDateString(b.date);
        if (bDateStr !== reqDateStr) return false;
        return isTimeOverlap(b.startTime, b.endTime, startTime, endTime);
      });

      if (conflicts.length > 1) {
        // Sort by creation order
        conflicts.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (tA !== tB) return tA - tB;
          return a._id.toString().localeCompare(b._id.toString());
        });

        // If this booking lost the race, roll it back
        if (conflicts[0]._id.toString() !== booking._id.toString()) {
          if (typeof SeatBooking.findByIdAndDelete === "function") {
            await SeatBooking.findByIdAndDelete(booking._id);
          } else if (typeof booking.deleteOne === "function") {
            await booking.deleteOne();
          }
          return res.status(409).json({
            success: false,
            message: "Seat is already reserved for the selected time interval.",
          });
        }
      }

      // Notifications in safe try-catch
      try {
        await createNotification({
          recipient: req.user._id,
          title: "Seat Booked",
          message: `Your seat (${seat.seatNumber}) has been booked successfully at ${library.name} from ${startTime} to ${endTime}.`,
          type: "SeatBooking",
        });
      } catch (notifyErr) {
        console.error("Notification (seat book - student) error:", notifyErr?.message || notifyErr);
      }

      try {
        if (library.librarian) {
          await createNotification({
            recipient: library.librarian,
            title: "New Seat Booking",
            message: `Seat ${seat.seatNumber} has been booked at ${library.name} from ${startTime} to ${endTime}.`,
            type: "SeatBooking",
          });
        }
      } catch (notifyErr) {
        console.error("Notification (seat book - librarian) error:", notifyErr?.message || notifyErr);
      }

      return res.status(201).json({
        success: true,
        message: "Seat booked successfully.",
        booking,
      });
    }

    // =========================================================================
    // CASE 2: Legacy Slot Booking (seatId omitted)
    // =========================================================================
    const existingBooking = await SeatBooking.findOne({
      student: req.user._id,
      library: libraryId,
      date,
      startTime,
      endTime,
      status: { $in: ["Booked", "booked"] },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "You have already booked this time slot.",
      });
    }

    const bookedSeats = await SeatBooking.countDocuments({
      library: libraryId,
      date,
      startTime,
      endTime,
      status: { $in: ["Booked", "booked"] },
    });

    if (bookedSeats >= library.seatCount) {
      return res.status(400).json({
        success: false,
        message: "No seats available for the selected time slot.",
      });
    }

    const booking = await SeatBooking.create({
      student: req.user._id,
      library: libraryId,
      date: bookingDate,
      startTime,
      endTime,
      status: "Booked",
    });

    // Notify student about legacy booking
    try {
      await createNotification({
        recipient: req.user._id,
        title: "Seat Booked",
        message: `Your seat has been booked successfully at ${library.name} from ${startTime} to ${endTime}.`,
        type: "SeatBooking",
      });
    } catch (notifyErr) {
      console.error("Notification (seat book - student) error:", notifyErr?.message || notifyErr);
    }

    // Notify librarian if assigned
    try {
      if (library.librarian) {
        await createNotification({
          recipient: library.librarian,
          title: "New Seat Booking",
          message: "A new seat booking has been made for your library.",
          type: "SeatBooking",
        });
      }
    } catch (notifyErr) {
      console.error("Notification (seat book - librarian) error:", notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: "Seat booked successfully.",
      booking,
    });
  } catch (error) {
    console.error("bookSeat error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * Seat availability query endpoint.
 * GET /api/seat-bookings/availability?libraryId=...&date=...&startTime=...&endTime=...
 *
 * Privacy Note: Returns seat layout with availability flags without revealing student identities.
 */
export const getSeatAvailability = async (req, res) => {
  try {
    const { libraryId, date, startTime, endTime } = req.query;

    if (!libraryId || !date) {
      return res.status(400).json({
        success: false,
        message: "Library ID and date are required.",
      });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format.",
      });
    }

    if (startTime || endTime) {
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Both startTime and endTime are required when specifying a time interval.",
        });
      }

      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid time format. Time must be in HH:mm 24-hour format.",
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: "Start time must be earlier than end time.",
        });
      }
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    // Retrieve all active seats for this library
    const seats = await Seat.find({
      library: libraryId,
      isActive: true,
    }).sort({ row: 1, column: 1, seatNumber: 1 });

    const reqDateStr = normalizeDateString(date);

    // Retrieve active bookings for this library
    const bookings = await SeatBooking.find({
      library: libraryId,
      status: { $in: ["Booked", "booked"] },
    });

    const dayBookings = bookings.filter((b) => {
      const bDateStr = normalizeDateString(b.date);
      return bDateStr === reqDateStr;
    });

    // Map each seat with availability flag, strictly excluding student PII
    const sanitizedSeats = seats.map((s) => {
      let isAvailable = true;

      if (startTime && endTime) {
        const hasConflict = dayBookings.some((b) => {
          if (!b.seat) return false;
          if (b.seat.toString() !== s._id.toString()) return false;
          return isTimeOverlap(b.startTime, b.endTime, startTime, endTime);
        });
        isAvailable = !hasConflict;
      } else {
        // If no interval provided, available if no active booking for the entire day
        const hasBooking = dayBookings.some(
          (b) => b.seat && b.seat.toString() === s._id.toString()
        );
        isAvailable = !hasBooking;
      }

      return {
        _id: s._id,
        seatNumber: s.seatNumber,
        row: s.row,
        column: s.column,
        type: s.type,
        isAvailable,
      };
    });

    const totalSeats = sanitizedSeats.length;
    const availableSeats = sanitizedSeats.filter((s) => s.isAvailable).length;
    const bookedSeats = totalSeats - availableSeats;

    return res.status(200).json({
      success: true,
      libraryId,
      date: reqDateStr,
      startTime: startTime || null,
      endTime: endTime || null,
      totalSeats,
      availableSeats,
      bookedSeats,
      seats: sanitizedSeats,
    });
  } catch (error) {
    console.error("getSeatAvailability error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * Student retrieves their own seat bookings.
 * GET /api/seat-bookings/my-bookings
 */
export const getMyBookings = async (req, res) => {
  try {
    const filter = { student: req.user._id };

    if (req.query.status) {
      filter.status = new RegExp(`^${req.query.status}$`, "i");
    }

    const bookings = await SeatBooking.find(filter)
      .populate("library", "name address city state image")
      .populate("seat", "seatNumber row column type")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("getMyBookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * Cancel a seat reservation.
 * PATCH /api/seat-bookings/:id/cancel
 */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await SeatBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isOwner = booking.student.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isAssignedLibrarian =
      req.user.role === "librarian" &&
      req.user.library &&
      booking.library &&
      booking.library.toString() === req.user.library.toString();

    if (!isOwner && !isAdmin && !isAssignedLibrarian) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking.",
      });
    }

    const currentStatus = booking.status ? booking.status.toLowerCase() : "";
    if (currentStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled.",
      });
    }

    if (currentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled.",
      });
    }

    booking.status = "Cancelled";
    await booking.save();

    // Notify student about cancellation
    try {
      const lib = await Library.findById(booking.library);
      const libraryName = lib ? lib.name : "the library";

      await createNotification({
        recipient: booking.student,
        title: "Seat Booking Cancelled",
        message: `Your seat booking at ${libraryName} has been cancelled successfully.`,
        type: "SeatBooking",
      });
    } catch (notifyErr) {
      console.error("Notification (cancel booking) error:", notifyErr?.message || notifyErr);
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking,
    });
  } catch (error) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * Complete or check-in a seat reservation.
 * PATCH /api/seat-bookings/:id/complete
 */
export const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await SeatBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isAssignedLibrarian =
      req.user.role === "librarian" &&
      req.user.library &&
      booking.library &&
      booking.library.toString() === req.user.library.toString();

    if (!isAdmin && !isAssignedLibrarian) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify bookings for another library.",
      });
    }

    const currentStatus = booking.status ? booking.status.toLowerCase() : "";
    if (currentStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be marked as completed.",
      });
    }

    if (currentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Booking is already completed.",
      });
    }

    booking.status = "Completed";
    await booking.save();

    // Notify student about completion
    try {
      const lib = await Library.findById(booking.library);
      const libraryName = lib ? lib.name : "the library";

      await createNotification({
        recipient: booking.student,
        title: "Seat Session Completed",
        message: `Your seat reservation at ${libraryName} has been marked as completed. Thank you!`,
        type: "SeatBooking",
      });
    } catch (notifyErr) {
      console.error("Notification (complete booking) error:", notifyErr?.message || notifyErr);
    }

    return res.status(200).json({
      success: true,
      message: "Booking completed successfully.",
      booking,
    });
  } catch (error) {
    console.error("completeBooking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const checkInBooking = completeBooking;

/**
 * Librarian retrieves bookings for their assigned library.
 * GET /api/seat-bookings/library
 */
export const getLibraryBookings = async (req, res) => {
  try {
    const libraryId = req.user.library;

    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: "No library assigned to this librarian.",
      });
    }

    const filter = { library: libraryId };

    if (req.query.status) {
      filter.status = new RegExp(`^${req.query.status}$`, "i");
    }

    if (req.query.seatId) {
      filter.seat = req.query.seatId;
    }

    const bookings = await SeatBooking.find(filter)
      .populate("student", "name email")
      .populate("seat", "seatNumber row column type")
      .populate("library", "name city")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("getLibraryBookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * Admin retrieves all bookings across platform with filters and pagination.
 * GET /api/seat-bookings
 */
export const getAllBookings = async (req, res) => {
  try {
    const { library, status, date, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (library) {
      filter.library = library;
    }

    if (status) {
      filter.status = new RegExp(`^${status}$`, "i");
    }

    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const startOfDay = new Date(d);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setUTCHours(23, 59, 59, 999);
        filter.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const skip = (page - 1) * limit;

    const bookings = await SeatBooking.find(filter)
      .populate("student", "name email")
      .populate("seat", "seatNumber row column type")
      .populate("library", "name city")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SeatBooking.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    console.error("getAllBookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
