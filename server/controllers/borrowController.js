import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Library from "../models/Library.js";

// @desc    Issue a book
// @route   POST /api/borrow
// @access  Private (Librarian/Admin)
export const issueBook = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    // library may be provided as `library` or `libraryId` in the body
    const libraryId = req.body.library || req.body.libraryId;

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
    });
  }
};