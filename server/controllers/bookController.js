import Book from "../models/Book.js";

// Create Book
export const createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      description,
      category,
      publisher,
      language,
      publishedYear,
      coverImage,
      totalCopies,
      availableCopies,
    } = req.body;

    // Basic Validation
    if (
      !title ||
      !author ||
      !isbn ||
      !category ||
      !totalCopies
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Check Duplicate ISBN
    const existingBook = await Book.findOne({ isbn });

    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: "Book with this ISBN already exists.",
      });
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      description,
      category,
      publisher,
      language,
      publishedYear,
      coverImage,
      totalCopies,
      availableCopies: availableCopies ?? totalCopies,
      addedBy: req.user?._id,
      libraryId: req.user?.libraryId,
    });

    res.status(201).json({
      success: true,
      message: "Book added successfully.",
      book,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};