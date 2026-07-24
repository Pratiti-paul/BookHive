import Library from "../models/Library.js";
import User from "../models/User.js";

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

    // Validate required fields
    if (!name || !address || !city || !state || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Check duplicate email
    const existingLibrary = await Library.findOne({ email });

    if (existingLibrary) {
      return res.status(400).json({
        success: false,
        message: "Library already exists with this email.",
      });
    }

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

// @desc    Get all libraries
// @route   GET /api/libraries
// @access  Public
export const getLibraries = async (req, res) => {
  try {
    const libraries = await Library.find()
      .populate("librarian", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: libraries.length,
      libraries,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get single library
// @route   GET /api/libraries/:id
// @access  Public
export const getLibraryById = async (req, res) => {
  try {
    const library = await Library.findById(req.params.id)
      .populate("librarian", "name email")
      .populate("createdBy", "name email");

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    res.status(200).json({
      success: true,
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

// @desc    Update library
// @route   PUT /api/libraries/:id
// @access  Private (Admin)
export const updateLibrary = async (req, res) => {
  try {
    const library = await Library.findById(req.params.id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    const updatedLibrary = await Library.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Library updated successfully.",
      library: updatedLibrary,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete library
// @route   DELETE /api/libraries/:id
// @access  Private (Admin)
export const deleteLibrary = async (req, res) => {
  try {
    const library = await Library.findById(req.params.id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    await library.deleteOne();

    res.status(200).json({
      success: true,
      message: "Library deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Assign librarian to a library
// @route   PUT /api/libraries/:library/assign/:userId
// @access  Private (Admin)
export const assignLibrarian = async (req, res) => {
  try {
    const { library, userId } = req.params;

    const library = await Library.findById(library);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role !== "librarian") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a librarian.",
      });
    }

    // Remove old assignment if any
    if (library.librarian) {
      await User.findByIdAndUpdate(library.librarian, {
        library: null,
      });
    }

    // Update both collections
    library.librarian = user._id;
    await library.save();

    user.library = library._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Librarian assigned successfully.",
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