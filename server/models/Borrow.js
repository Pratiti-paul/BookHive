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

    requestDate: {
      type: Date,
      default: Date.now,
    },

    issueDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    actionDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "borrowed", "returned", "overdue", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    fine: {
      type: Number,
      default: 0,
    },

    renewCount: {
      type: Number,
      default: 0,
    },

    renewalStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },

    renewalRejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast lookups
borrowSchema.index({ student: 1, status: 1 });
borrowSchema.index({ library: 1, status: 1 });
borrowSchema.index({ book: 1, status: 1 });

const Borrow = mongoose.model("Borrow", borrowSchema);

export default Borrow;
