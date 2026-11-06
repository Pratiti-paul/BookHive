import mongoose from "mongoose";

const seatBookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Booked", "Cancelled", "Completed"],
      default: "Booked",
    },

    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seatBookingSchema.index({ seat: 1, status: 1 });
seatBookingSchema.index({ library: 1, date: 1, status: 1 });

export default mongoose.model("SeatBooking", seatBookingSchema);