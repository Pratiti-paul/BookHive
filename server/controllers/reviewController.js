import Review from "../models/Review.js";
import Book from "../models/Book.js";
import Borrow from "../models/Borrow.js";
import createNotification from "../utils/createNotification.js";

/**
 * Recalculate and update the average rating and total reviews for a book.
 * Handles books with zero reviews cleanly.
 */
export const updateBookRatingStats = async (bookId) => {
  try {
    const reviews = await Review.find({ book: bookId });
    const totalReviews = reviews.length;
    let rating = 0;

    if (totalReviews > 0) {
      const sum = reviews.reduce((total, rev) => total + (Number(rev.rating) || 0), 0);
      rating = Math.round((sum / totalReviews) * 10) / 10;
    }

    await Book.findByIdAndUpdate(bookId, {
      rating,
      totalReviews,
    });

    return { rating, totalReviews };
  } catch (err) {
    console.error("Error updating book rating stats:", err?.message || err);
    return { rating: 0, totalReviews: 0 };
  }
};

// @desc    Create a review (students only)
// @route   POST /api/reviews
// @access  Private (Student)
export const createReview = async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;

    if (!bookId || rating == null) {
      return res.status(400).json({
        success: false,
        message: "Book ID and rating are required.",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Ensure the student has borrowed the book
    const hasBorrowed = await Borrow.findOne({
      student: req.user._id,
      book: bookId,
    });

    if (
      !hasBorrowed ||
      hasBorrowed.status === "pending" ||
      hasBorrowed.status === "rejected"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only review books that you have borrowed.",
      });
    }

    // Prevent duplicate reviews from the same student
    const existingReview = await Review.findOne({
      student: req.user._id,
      book: bookId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this book.",
      });
    }

    const review = await Review.create({
      student: req.user._id,
      book: bookId,
      rating: numRating,
      comment: typeof comment === "string" ? comment.trim() : "",
    });

    // Update book rating stats
    const stats = await updateBookRatingStats(bookId);

    // Notify student about successful review submission
    try {
      await createNotification({
        recipient: req.user._id,
        title: "Review Submitted",
        message: `Thank you for reviewing "${book.title}".`,
        type: "Review",
      });
    } catch (notifyErr) {
      console.error("Notification (review) error:", notifyErr?.message || notifyErr);
    }

    const populatedReview = await Review.findById(review._id)
      .populate("student", "name email")
      .populate("book", "title author coverImage rating totalReviews");

    res.status(201).json({
      success: true,
      message: "Review added successfully.",
      review: populatedReview || review,
      bookStats: stats,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this book.",
      });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get all reviews for a book
// @route   GET /api/reviews/book/:bookId
// @access  Private
export const getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const reviews = await Review.find({ book: bookId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get logged-in student's own reviews
// @route   GET /api/reviews/my-reviews
// @access  Private (Student)
export const getMyReviews = async (req, res) => {
  try {
    const rawReviews = await Review.find({
      student: req.user._id,
    })
      .populate(
        "book",
        "title author coverImage isbn category rating totalReviews"
      )
      .sort({ createdAt: -1 });

    // Safely filter out reviews whose referenced book was removed
    const reviews = rawReviews.filter((item) => item.book != null);

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
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

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Student)
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating == null) {
      return res.status(400).json({
        success: false,
        message: "Rating is required.",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (review.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this review.",
      });
    }

    review.rating = numRating;
    if (comment !== undefined) {
      review.comment = typeof comment === "string" ? comment.trim() : "";
    }

    await review.save();

    // Recalculate book rating stats
    const stats = await updateBookRatingStats(review.book);

    let populatedReview = null;
    try {
      if (typeof Review.findById(review._id)?.populate === "function") {
        populatedReview = await Review.findById(review._id)
          .populate("student", "name email")
          .populate("book", "title author coverImage rating totalReviews");
      }
    } catch {
      populatedReview = review;
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review: populatedReview || review,
      bookStats: stats,
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

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Student)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (review.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review.",
      });
    }

    const targetBookId = review.book;
    await review.deleteOne();

    // Recalculate book rating stats (handles zero reviews remaining)
    const stats = await updateBookRatingStats(targetBookId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
      bookStats: stats,
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
