import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Library from "../models/Library.js";
import createNotification from "../utils/createNotification.js";

// ==========================================
// STUDENT WORKFLOW: REQUEST TO BORROW
// ==========================================

// @desc    Student requests to borrow a book
// @route   POST /api/borrow/request
// @access  Private (Student)
export const requestBorrow = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: "Book ID is required.",
      });
    }

    // Find the book and its library
    const book = await Book.findById(bookId).populate("library");

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Check availability
    if (book.availableCopies <= 0 || book.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Book is currently unavailable for borrowing.",
      });
    }

    // Check if the student already has an active borrow or pending request for this book
    const existingBorrow = await Borrow.findOne({
      student: req.user._id,
      book: book._id,
      status: { $in: ["pending", "borrowed"] },
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message:
          existingBorrow.status === "pending"
            ? "You already have a pending borrow request for this book."
            : "You currently have this book checked out.",
      });
    }

    const targetLibraryId = book.library._id || book.library;

    // Create pending borrow request (inventory is NOT decremented until librarian approval)
    const borrow = await Borrow.create({
      student: req.user._id,
      book: book._id,
      library: targetLibraryId,
      status: "pending",
      requestDate: new Date(),
    });

    // Notify student
    try {
      await createNotification({
        recipient: req.user._id,
        title: "Borrow Request Submitted",
        message: `Your request to borrow "${book.title}" has been submitted and is awaiting librarian approval.`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (student request) error:", notifyErr?.message || notifyErr);
    }

    // Notify librarian if library has an assigned librarian
    try {
      const libraryDoc = await Library.findById(targetLibraryId);
      if (libraryDoc?.librarian) {
        await createNotification({
          recipient: libraryDoc.librarian,
          title: "New Borrow Request",
          message: `${req.user.name || "A student"} requested to borrow "${book.title}".`,
          type: "Borrow",
        });
      }
    } catch (notifyErr) {
      console.error("Notification (librarian request) error:", notifyErr?.message || notifyErr);
    }

    const populatedBorrow = await Borrow.findById(borrow._id)
      .populate("book", "title author coverImage isbn category")
      .populate("library", "name city address");

    res.status(201).json({
      success: true,
      message: "Borrow request submitted successfully.",
      borrow: populatedBorrow,
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

// ==========================================
// LIBRARIAN / ADMIN WORKFLOW: MANAGE REQUESTS
// ==========================================

// @desc    Get borrow requests (pending by default)
// @route   GET /api/borrow/requests
// @access  Private (Librarian/Admin)
export const getBorrowRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const query = {};

    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }
      query.library = req.user.library;
    } else if (req.user.role === "admin") {
      if (req.query.library) {
        query.library = req.query.library;
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view borrow requests.",
      });
    }

    if (status !== "all") {
      query.status = status;
    }

    const requests = await Borrow.find(query)
      .populate("student", "name email profileImage")
      .populate("book", "title author isbn coverImage availableCopies totalCopies")
      .populate("library", "name city")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Librarian approves a borrow request
// @route   PUT /api/borrow/requests/:borrowId/approve
// @access  Private (Librarian/Admin)
export const approveBorrowRequest = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow request not found.",
      });
    }

    // Role and library multi-tenancy verification
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to approve requests for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to approve borrow requests.",
      });
    }

    if (borrow.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status "${borrow.status}". Only pending requests can be approved.`,
      });
    }

    // Atomic inventory validation and decrement to prevent race conditions or overselling
    const updatedBook = await Book.findOneAndUpdate(
      {
        _id: borrow.book,
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
      },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve request: No copies are currently available.",
      });
    }

    if (updatedBook.availableCopies === 0) {
      updatedBook.status = "unavailable";
      await updatedBook.save();
    }

    // Set 14-day loan window
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    borrow.status = "borrowed";
    borrow.issueDate = issueDate;
    borrow.dueDate = dueDate;
    borrow.actionDate = new Date();
    borrow.reviewedBy = req.user._id;

    await borrow.save();

    // Notify student about approval
    try {
      const formattedDue = dueDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      await createNotification({
        recipient: borrow.student,
        title: "Borrow Request Approved",
        message: `Your request to borrow "${updatedBook.title}" has been approved! Due date: ${formattedDue}.`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (approval) error:", notifyErr?.message || notifyErr);
    }

    const populatedBorrow = await Borrow.findById(borrow._id)
      .populate("student", "name email")
      .populate("book", "title author isbn coverImage availableCopies")
      .populate("library", "name city");

    res.status(200).json({
      success: true,
      message: "Borrow request approved successfully.",
      borrow: populatedBorrow,
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

// @desc    Librarian rejects a borrow request
// @route   PUT /api/borrow/requests/:borrowId/reject
// @access  Private (Librarian/Admin)
export const rejectBorrowRequest = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const { reason } = req.body;

    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow request not found.",
      });
    }

    // Role and library multi-tenancy verification
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to reject requests for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to reject borrow requests.",
      });
    }

    if (borrow.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status "${borrow.status}". Only pending requests can be rejected.`,
      });
    }

    // Rejection does not alter book inventory
    borrow.status = "rejected";
    borrow.actionDate = new Date();
    borrow.rejectionReason = reason?.trim() || "Request declined by librarian.";
    borrow.reviewedBy = req.user._id;

    await borrow.save();

    // Notify student about rejection
    try {
      const bookDoc = await Book.findById(borrow.book);
      const bookTitle = bookDoc?.title || "your requested book";

      await createNotification({
        recipient: borrow.student,
        title: "Borrow Request Declined",
        message: `Your request to borrow "${bookTitle}" was declined: ${borrow.rejectionReason}`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (rejection) error:", notifyErr?.message || notifyErr);
    }

    const populatedBorrow = await Borrow.findById(borrow._id)
      .populate("student", "name email")
      .populate("book", "title author isbn coverImage")
      .populate("library", "name city");

    res.status(200).json({
      success: true,
      message: "Borrow request rejected.",
      borrow: populatedBorrow,
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

// ==========================================
// STUDENT & LIBRARIAN RENEWALS WORKFLOW
// ==========================================

// @desc    Student requests a renewal for an active loan
// @route   PUT /api/borrow/:borrowId/request-renewal
// @access  Private (Student)
export const requestRenewal = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId).populate("book").populate("library");

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Verify ownership
    if (borrow.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request renewals for your own borrowed books.",
      });
    }

    // Verify active borrowing
    if (borrow.status !== "borrowed") {
      return res.status(400).json({
        success: false,
        message: "Only actively borrowed books can be renewed.",
      });
    }

    // Check if overdue
    if (new Date() > new Date(borrow.dueDate)) {
      return res.status(400).json({
        success: false,
        message: "Overdue books cannot be renewed online. Please return the book to the library.",
      });
    }

    // Check renewal limit
    if (borrow.renewCount >= 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum renewal limit (1 renewal) has already been reached for this loan.",
      });
    }

    // Check if already requested
    if (borrow.renewalStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "A renewal request is already pending review for this book.",
      });
    }

    borrow.renewalStatus = "pending";
    await borrow.save();

    // Notify librarian if assigned
    try {
      if (borrow.library?.librarian) {
        await createNotification({
          recipient: borrow.library.librarian,
          title: "New Renewal Request",
          message: `${req.user.name || "A student"} requested a renewal for "${borrow.book?.title || "a book"}".`,
          type: "Borrow",
        });
      }
    } catch (notifyErr) {
      console.error("Notification (renewal request) error:", notifyErr?.message || notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Renewal request submitted successfully. Awaiting librarian approval.",
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

// @desc    Librarian approves a renewal request
// @route   PUT /api/borrow/renewals/:borrowId/approve
// @access  Private (Admin/Librarian)
export const approveRenewalRequest = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId).populate("book");

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Scoping check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to approve renewals for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to approve renewal requests.",
      });
    }

    if (borrow.status !== "borrowed" || borrow.renewalStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending renewal request found for this loan.",
      });
    }

    if (borrow.renewCount >= 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum renewal limit reached.",
      });
    }

    // Extend due date by 14 days
    const currentDueDate = new Date(borrow.dueDate || Date.now());
    currentDueDate.setDate(currentDueDate.getDate() + 14);

    borrow.dueDate = currentDueDate;
    borrow.renewCount += 1;
    borrow.renewalStatus = "approved";

    await borrow.save();

    // Notify student
    try {
      const formattedDue = currentDueDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      await createNotification({
        recipient: borrow.student,
        title: "Renewal Approved",
        message: `Your renewal request for "${borrow.book?.title || "the book"}" has been approved! New due date: ${formattedDue}.`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (renewal approve) error:", notifyErr?.message || notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Renewal request approved successfully.",
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

// @desc    Librarian rejects a renewal request
// @route   PUT /api/borrow/renewals/:borrowId/reject
// @access  Private (Admin/Librarian)
export const rejectRenewalRequest = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const { reason } = req.body;

    const borrow = await Borrow.findById(borrowId).populate("book");

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Scoping check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to reject renewals for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to reject renewal requests.",
      });
    }

    if (borrow.renewalStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending renewal request found for this loan.",
      });
    }

    borrow.renewalStatus = "rejected";
    borrow.renewalRejectionReason = reason?.trim() || "Renewal request declined by librarian.";

    await borrow.save();

    // Notify student
    try {
      await createNotification({
        recipient: borrow.student,
        title: "Renewal Request Declined",
        message: `Your renewal request for "${borrow.book?.title || "the book"}" was declined: ${borrow.renewalRejectionReason}`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (renewal reject) error:", notifyErr?.message || notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Renewal request rejected.",
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

// ==========================================
// EXISTING BORROWING & FINE FUNCTIONS
// ==========================================

// @desc    Return a Book (preserves fine calculation)
// @route   PUT /api/borrow/:borrowId/return
// @access  Private (Admin/Librarian)
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Multi-tenancy library authorization check
    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to return books for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to return books.",
      });
    }

    if (borrow.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "Book has already been returned.",
      });
    }

    if (borrow.status === "pending" || borrow.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot return a book that was never issued.",
      });
    }

    const book = await Book.findById(borrow.book);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Safely increase available copies
    book.availableCopies += 1;
    if (book.availableCopies > 0) {
      book.status = "available";
    }
    await book.save();

    // Set return date & calculate fine (£/₹ 10 per overdue day)
    borrow.returnDate = new Date();
    const dueDate = new Date(borrow.dueDate);
    const returnDate = borrow.returnDate;

    if (returnDate > dueDate) {
      const overdueDays = Math.round((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      borrow.fine = Math.max(overdueDays, 1) * 10;
    } else {
      borrow.fine = 0;
    }

    borrow.status = "returned";
    await borrow.save();

    // Notify student
    try {
      await createNotification({
        recipient: borrow.student,
        title: "Book Returned",
        message: `You have successfully returned "${book.title}".${borrow.fine > 0 ? ` Overdue fine: ₹${borrow.fine}.` : ""}`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (return) error:", notifyErr?.message || notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Book returned successfully.",
      fine: borrow.fine,
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

// @desc    Direct Librarian Renewal (preserves manual librarian renewal)
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

    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (borrow.library.toString() !== req.user.library.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to renew books for another library.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to renew books.",
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

    const dueDate = new Date(borrow.dueDate || Date.now());
    dueDate.setDate(dueDate.getDate() + 14);

    borrow.dueDate = dueDate;
    borrow.renewCount += 1;
    borrow.renewalStatus = "approved";

    await borrow.save();

    try {
      const renewedBook = await Book.findById(borrow.book);
      const bookTitle = renewedBook ? renewedBook.title : "the book";

      await createNotification({
        recipient: borrow.student,
        title: "Book Renewed",
        message: `Your borrowing period for "${bookTitle}" has been renewed.`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (renew) error:", notifyErr?.message || notifyErr);
    }

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

// @desc    Get logged-in student's borrowed books & requests
// @route   GET /api/borrow/my-books
// @access  Private (Student)
export const getMyBorrowedBooks = async (req, res) => {
  try {
    const borrows = await Borrow.find({
      student: req.user._id,
    })
      .populate("book")
      .populate("library", "name city address")
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

// @desc    Get all borrow records (scoped to librarian's library; all for admin)
// @route   GET /api/borrow
// @access  Private (Admin/Librarian)
export const getAllBorrowRecords = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }
      query.library = req.user.library;
    } else if (req.user.role === "admin") {
      if (req.query.library) {
        query.library = req.query.library;
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access borrow records.",
      });
    }

    const borrows = await Borrow.find(query)
      .populate("student", "name email")
      .populate("book", "title author isbn coverImage")
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

// @desc    Get overdue books (scoped to librarian's library; all for admin)
// @route   GET /api/borrow/overdue
// @access  Private (Admin/Librarian)
export const getOverdueBooks = async (req, res) => {
  try {
    const today = new Date();

    const query = {
      dueDate: { $lt: today },
      status: "borrowed",
    };

    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }
      query.library = req.user.library;
    } else if (req.user.role === "admin") {
      if (req.query.library) {
        query.library = req.query.library;
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access overdue records.",
      });
    }

    const borrows = await Borrow.find(query)
      .populate("student", "name email")
      .populate("book", "title author isbn coverImage")
      .populate("library", "name city");

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

// @desc    Direct Issue a Book by Librarian (walk-in checkout)
// @route   POST /api/borrow
// @access  Private (Admin/Librarian)
export const issueBook = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;
    const requestedLibraryId = req.body.library || req.body.libraryId;

    if (!studentId || !bookId) {
      return res.status(400).json({
        success: false,
        message: "Student and Book are required.",
      });
    }

    let targetLibraryId;

    if (req.user.role === "librarian") {
      if (!req.user.library) {
        return res.status(403).json({
          success: false,
          message: "No library assigned to this librarian.",
        });
      }

      if (
        requestedLibraryId &&
        requestedLibraryId.toString() !== req.user.library.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only issue books for your assigned library.",
        });
      }

      targetLibraryId = req.user.library;
    } else if (req.user.role === "admin") {
      targetLibraryId = requestedLibraryId;
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to issue books.",
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    if (!targetLibraryId) {
      targetLibraryId = book.library;
    }

    const libraryDoc = await Library.findById(targetLibraryId);
    if (!libraryDoc) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    if (book.library.toString() !== libraryDoc._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "This book does not belong to the selected library.",
      });
    }

    if (
      req.user.role === "librarian" &&
      book.library.toString() !== req.user.library.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot issue books belonging to another library.",
      });
    }

    const existingBorrow = await Borrow.findOne({
      student: student._id,
      book: book._id,
      status: { $in: ["pending", "borrowed"] },
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message:
          existingBorrow.status === "pending"
            ? "Student has a pending request for this book."
            : "Student already has this book borrowed.",
      });
    }

    // Atomic decrement
    const updatedBook = await Book.findOneAndUpdate(
      { _id: book._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(400).json({
        success: false,
        message: "Book is currently unavailable.",
      });
    }

    if (updatedBook.availableCopies === 0) {
      updatedBook.status = "unavailable";
      await updatedBook.save();
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const borrow = await Borrow.create({
      student: student._id,
      book: book._id,
      library: libraryDoc._id,
      status: "borrowed",
      issueDate: new Date(),
      dueDate,
      actionDate: new Date(),
      reviewedBy: req.user._id,
    });

    try {
      await createNotification({
        recipient: student._id,
        title: "Book Issued",
        message: `You have been issued "${book.title}".`,
        type: "Borrow",
      });
    } catch (notifyErr) {
      console.error("Notification (issue) error:", notifyErr?.message || notifyErr);
    }

    const populatedBorrow = await Borrow.findById(borrow._id)
      .populate("student", "name email")
      .populate("book", "title author isbn")
      .populate("library", "name city");

    res.status(201).json({
      success: true,
      message: "Book issued successfully.",
      borrow: populatedBorrow,
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
