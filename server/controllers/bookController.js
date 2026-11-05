import Book from "../models/Book.js";
import Library from "../models/Library.js";
import Borrow from "../models/Borrow.js";

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
      library: requestedLibrary,
      libraryId: requestedLibraryId,
    } = req.body;

    // Basic Validation
    if (!title || !author || !isbn || !category || !totalCopies) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Determine target library based on role
    let targetLibraryId;

    if (req.user.role === "admin") {
      targetLibraryId = requestedLibrary || requestedLibraryId || req.user.library;

      if (!targetLibraryId) {
        return res.status(400).json({
          success: false,
          message: "Target library is required when adding a book as admin.",
        });
      }

      const targetLibrary = await Library.findById(targetLibraryId);
      if (!targetLibrary) {
        return res.status(404).json({
          success: false,
          message: "Specified library not found.",
        });
      }
    } else if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      const requestedLib = requestedLibrary || requestedLibraryId;
      if (
        requestedLib &&
        requestedLib.toString() !== req.user.library.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only add books to your assigned library.",
        });
      }

      targetLibraryId = req.user.library;
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create books.",
      });
    }

    // Check duplicate ISBN within the target library
    const existingBook = await Book.findOne({
      isbn,
      library: targetLibraryId,
    });

    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: "Book with this ISBN already exists in this library.",
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
      addedBy: req.user._id,
      library: targetLibraryId,
    });

    // Populate library details for response
    const populatedBook = await Book.findById(book._id)
      .populate("library", "name city address")
      .populate("addedBy", "name email");

    res.status(201).json({
      success: true,
      message: "Book added successfully.",
      book: populatedBook,
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
      library,
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

    // Filter by library (multi-tenancy filter)
    if (library) {
      query.library = library;
    }

    const books = await Book.find(query)
      .populate("addedBy", "name email")
      .populate("library", "name city address")
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
      .populate("addedBy", "name email")
      .populate(
        "library",
        "name description address city state email phone openingHours"
      );

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

    // Multi-tenancy authorization check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (book.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to update books from another library.",
        });
      }

      // Librarians cannot reassign book to a different library
      delete req.body.library;
      delete req.body.libraryId;
    } else if (req.user.role === "admin") {
      if (req.body.library) {
        const targetLibrary = await Library.findById(req.body.library);
        if (!targetLibrary) {
          return res.status(404).json({
            success: false,
            message: "Target library not found.",
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update books.",
      });
    }

    // Check ISBN uniqueness within target library if ISBN is being updated
    if (req.body.isbn && req.body.isbn !== book.isbn) {
      const duplicateBook = await Book.findOne({
        isbn: req.body.isbn,
        library: req.body.library || book.library,
        _id: { $ne: book._id },
      });

      if (duplicateBook) {
        return res.status(400).json({
          success: false,
          message:
            "Another book with this ISBN already exists in this library.",
        });
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("library", "name city address")
      .populate("addedBy", "name email");

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

    // Multi-tenancy authorization check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (book.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to delete books from another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete books.",
      });
    }

    // Ensure no active loans exist before deletion
    const activeBorrow = await Borrow.findOne({
      book: book._id,
      status: "borrowed",
    });

    if (activeBorrow) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete book while copies are currently borrowed.",
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

