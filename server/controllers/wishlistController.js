import Wishlist from "../models/Wishlist.js";
import Book from "../models/Book.js";
import createNotification from "../utils/createNotification.js";

export const addToWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const existingWishlist = await Wishlist.findOne({
      student: req.user._id,
      book: bookId,
    });

    if (existingWishlist) {
      return res.status(400).json({
        success: false,
        message: "Book already exists in wishlist.",
      });
    }

    const wishlist = await Wishlist.create({
      student: req.user._id,
      book: bookId,
    });

    // Notify student about wishlist update
    try {
      await createNotification({
        recipient: req.user._id,
        title: "Wishlist Updated",
        message: `"${book.title}" has been added to your wishlist.`,
        type: "Wishlist",
      });
    } catch (notifyErr) {
      console.error("Notification (wishlist add) error:", notifyErr?.message || notifyErr);
    }

    res.status(201).json({
      success: true,
      message: "Book added to wishlist successfully.",
      wishlist,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMyWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({
      student: req.user._id,
    })
      .populate(
        "book",
        "title author coverImage category availableCopies totalCopies"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: wishlist.length,
      wishlist,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;

    const wishlist = await Wishlist.findOne({
      student: req.user._id,
      book: bookId,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Book not found in wishlist.",
      });
    }

    // Fetch book title for notification
    const book = await Book.findById(bookId);

    await wishlist.deleteOne();

    // Notify student about wishlist removal
    try {
      await createNotification({
        recipient: req.user._id,
        title: "Wishlist Updated",
        message: `"${book ? book.title : "The book"}" has been removed from your wishlist.`,
        type: "Wishlist",
      });
    } catch (notifyErr) {
      console.error("Notification (wishlist remove) error:", notifyErr?.message || notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Book removed from wishlist successfully.",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};