import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Library from "../models/Library.js";


// @desc    Return a Book
// @route   PUT /api/borrow/:borrowId/return
// @access  Private (Admin/Librarian)
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    // Find borrow record
    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Check if already returned
    if (borrow.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "Book has already been returned.",
      });
    }

    // Find book
    const book = await Book.findById(borrow.book);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Increase available copies
    book.availableCopies += 1;

    // Update status if copies are available
    if (book.availableCopies > 0) {
      book.status = "available";
    }

    await book.save();

    // Update borrow record
    borrow.status = "returned";
    borrow.returnDate = new Date();

    await borrow.save();

    res.status(200).json({
      success: true,
      message: "Book returned successfully.",
      borrow,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// @desc    Renew a Book
// @route   PUT /api/borrow/:borrowId/renew
// @access  Private (Admin/Librarian)
export const renewBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    if (borrow.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "Returned books cannot be renewed.",
      });
    }

    if (borrow.renewCount >= 1) {
      return res.status(400).json({
        success: false,
        message: "Renewal limit reached.",
      });
    }

    const dueDate = new Date(borrow.dueDate);
    dueDate.setDate(dueDate.getDate() + 14);

    borrow.dueDate = dueDate;
    borrow.renewCount += 1;

    await borrow.save();

    res.status(200).json({
      success: true,
      message: "Book renewed successfully.",
      borrow,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get logged-in student's borrowed books
// @route   GET /api/borrow/my-books
// @access  Private (Student)
export const getMyBorrowedBooks = async (req, res) => {
  try {
    const borrows = await Borrow.find({
      student: req.user._id,
    })
      .populate("book")
      .populate("library", "name city")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: borrows.length,
      borrows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get all borrow records
// @route   GET /api/borrow
// @access  Private (Admin/Librarian)
export const getAllBorrowRecords = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate("student", "name email")
      .populate("book", "title author")
      .populate("library", "name city")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: borrows.length,
      borrows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Issue a Book
// @route   POST /api/borrow
// @access  Private (Admin/Librarian)
export const issueBook = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const libraryId = req.body.library || req.body.libraryId;

    // Validate required fields
    if (!studentId || !bookId || !libraryId) {
      return res.status(400).json({
        success: false,
        message: "Student, Book and Library are required.",
      });
    }

    // Check student
    const student = await User.findById(studentId);

    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Check book
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Check library
    const libraryDoc = await Library.findById(libraryId);

    if (!libraryDoc) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    // Check if the book belongs to this library
    if (book.library.toString() !== libraryDoc._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "This book does not belong to the selected library.",
      });
    }

    // Check if student already borrowed this book
    const existingBorrow = await Borrow.findOne({
      student: student._id,
      book: book._id,
      status: "borrowed",
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: "Student already has this book.",
      });
    }

    // Check availability
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: "Book is currently unavailable.",
      });
    }

    // Due date (14 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create borrow record
    const borrow = await Borrow.create({
      student: student._id,
      book: book._id,
      library: libraryDoc._id,
      dueDate,
    });

    // Reduce available copies
    book.availableCopies -= 1;

    // Update book status if no copies left
    if (book.availableCopies === 0) {
      book.status = "unavailable";
    }

    await book.save();

    res.status(201).json({
      success: true,
      message: "Book issued successfully.",
      borrow,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};