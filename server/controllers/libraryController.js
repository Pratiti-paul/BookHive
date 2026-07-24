import Library from "../models/Library.js";

// @desc    Create a new library
// @route   POST /api/libraries
// @access  Private (Admin)
export const createLibrary = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      email,
      phone,
      openingHours,
      image,
      seatCount,
    } = req.body;

    // Check required fields
    if (!name || !address || !city || !state || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Check if a library with the same email already exists
    const existingLibrary = await Library.findOne({ email });

    if (existingLibrary) {
      return res.status(400).json({
        success: false,
        message: "Library already exists with this email.",
      });
    }

    // Create library
    const library = await Library.create({
      name,
      description,
      address,
      city,
      state,
      country,
      email,
      phone,
      openingHours,
      image,
      seatCount,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Library created successfully.",
      library,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};