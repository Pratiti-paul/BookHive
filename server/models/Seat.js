import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: [true, "Library reference is required."],
    },

    seatNumber: {
      type: String,
      required: [true, "Seat number is required."],
      trim: true,
    },

    row: {
      type: Number,
      required: [true, "Row number is required."],
      min: [1, "Row must be at least 1."],
    },

    column: {
      type: Number,
      required: [true, "Column number is required."],
      min: [1, "Column must be at least 1."],
    },

    type: {
      type: String,
      enum: {
        values: ["regular", "window", "premium", "accessible"],
        message: "{VALUE} is not a supported seat type.",
      },
      default: "regular",
      lowercase: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Seat number must be unique within its library
seatSchema.index({ library: 1, seatNumber: 1 }, { unique: true });

// Compound unique index: Row and column position must be unique within its library
seatSchema.index({ library: 1, row: 1, column: 1 }, { unique: true });

// Index for fast query of active seats in a library
seatSchema.index({ library: 1, isActive: 1 });

const Seat = mongoose.model("Seat", seatSchema);

export default Seat;

