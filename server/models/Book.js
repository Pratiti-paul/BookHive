import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: String,
      required: true,
      trim: true,
    },

    isbn: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
    },

    publisher: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: "English",
    },

    publishedYear: {
      type: Number,
    },

    coverImage: {
      type: String,
      default: "",
    },

    totalCopies: {
      type: Number,
      required: true,
      min: 1,
    },

    availableCopies: {
      type: Number,
      required: true,
      min: 0,
    },

    library: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Library",
  required: true,
},

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure ISBN uniqueness is scoped per library
bookSchema.index({ isbn: 1, library: 1 }, { unique: true });

export default mongoose.model("Book", bookSchema);