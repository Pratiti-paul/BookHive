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

// Get All Books
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find()
      .populate("addedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Single Book
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate("addedBy", "name email");

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    res.status(200).json({
      success: true,
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

// Update Book
export const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      book: updatedBook,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Delete Book
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    await book.deleteOne();

    res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

