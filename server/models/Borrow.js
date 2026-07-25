import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["borrowed", "returned", "overdue"],
      default: "borrowed",
    },

    fine: {
      type: Number,
      default: 0,
    },

    renewCount: {
    type: Number,
    default: 0,
  },
  },
  {
    timestamps: true,
  }
);

const Borrow = mongoose.model("Borrow", borrowSchema);

export default Borrow;