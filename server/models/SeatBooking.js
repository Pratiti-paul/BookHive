import mongoose from "mongoose";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const seatBookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required."],
    },

    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: [true, "Library reference is required."],
    },

    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      default: null,
    },

    date: {
      type: Date,
      required: [true, "Booking date is required."],
    },

    startTime: {
      type: String,
      required: [true, "Start time is required."],
      match: [timeRegex, "Start time must be in HH:mm 24-hour format."],
    },

    endTime: {
      type: String,
      required: [true, "End time is required."],
      match: [timeRegex, "End time must be in HH:mm 24-hour format."],
    },

    status: {
      type: String,
      enum: {
        values: ["booked", "cancelled", "completed", "Booked", "Cancelled", "Completed"],
        message: "{VALUE} is not a valid booking status.",
      },
      default: "Booked",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal query performance
seatBookingSchema.index({ seat: 1, date: 1, status: 1 });
seatBookingSchema.index({ student: 1, date: 1, status: 1 });
seatBookingSchema.index({ library: 1, date: 1, status: 1 });
seatBookingSchema.index({ seat: 1, status: 1 });

const SeatBooking = mongoose.model("SeatBooking", seatBookingSchema);

export default SeatBooking;
