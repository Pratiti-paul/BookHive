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
    const {
      search,
      category,
      status,
      sort = "createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Search by title or author
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const books = await Book.find(query)
      .populate("addedBy", "name email")
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const totalBooks = await Book.countDocuments(query);

    res.status(200).json({
      success: true,
      totalBooks,
      currentPage: Number(page),
      totalPages: Math.ceil(totalBooks / Number(limit)),
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

