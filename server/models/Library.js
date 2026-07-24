import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    // Address
    address: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      default: "India",
    },

    // Contact
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    website: {
      type: String,
      default: "",
    },

    // Working Hours
    openingHours: {
      type: String,
      default: "09:00 AM - 06:00 PM",
    },

    // Library Image
    image: {
      type: String,
      default: "",
    },

    // Location (Future Maps Support)
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },

    // Facilities
    facilities: [
      {
        type: String,
      },
    ],

    // Assigned Librarian
    librarian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Statistics
    bookCount: {
      type: Number,
      default: 0,
    },

    seatCount: {
      type: Number,
      default: 0,
    },

    availableSeats: {
      type: Number,
      default: 0,
    },

    // Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Admin who created the library
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Library = mongoose.model("Library", librarySchema);

export default Library;