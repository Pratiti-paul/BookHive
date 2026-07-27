import Review from "../models/Review.js";
import Book from "../models/Book.js";
import Borrow from "../models/Borrow.js";

// Create a review (students only)
export const createReview = async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;

    if (!bookId || rating == null) {
      return res.status(400).json({
        success: false,
        message: "Book ID and rating are required.",
      });
    }

    if (rating < 1 || rating > 5) {
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

    // Ensure the user has borrowed the book at least once
    const hasBorrowed = await Borrow.findOne({
      student: req.user._id,
      book: bookId,
    });

    if (!hasBorrowed) {
      return res.status(403).json({
        success: false,
        message: "You can only review books that you have borrowed.",
      });
    }

    // Prevent duplicate reviews from same student
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
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully.",
      review,
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

// Get all reviews for a book
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
      .populate("student", "name")
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

export const getMyReviews = async (req, res) => {
  try {

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required.",
      });
    }

    if (rating < 1 || rating > 5) {
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

    review.rating = rating;
    review.comment = comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


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

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};