import SeatBooking from "../models/SeatBooking.js";
import Library from "../models/Library.js";

export const bookSeat = async (req, res) => {
  try {
    const { libraryId, date, startTime, endTime } = req.body;

    if (!libraryId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const library = await Library.findById(libraryId);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    const existingBooking = await SeatBooking.findOne({
      student: req.user._id,
      library: libraryId,
      date,
      startTime,
      endTime,
      status: "Booked",
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
      status: "Booked",
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
      date,
      startTime,
      endTime,
    });

    res.status(201).json({
      success: true,
      message: "Seat booked successfully.",
      booking,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await SeatBooking.find({
      student: req.user._id,
    })
      .populate(
        "library",
        "name address city state"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

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

    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking.",
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled.",
      });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled.",
      });
    }

    booking.status = "Cancelled";

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};