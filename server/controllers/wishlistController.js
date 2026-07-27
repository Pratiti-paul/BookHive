import Wishlist from "../models/Wishlist.js";
import Book from "../models/Book.js";

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