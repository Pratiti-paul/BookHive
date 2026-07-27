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