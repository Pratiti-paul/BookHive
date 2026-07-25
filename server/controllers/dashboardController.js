import Book from "../models/Book.js";
import Borrow from "../models/Borrow.js";
import Library from "../models/Library.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();

    const totalLibraries = await Library.countDocuments();

    const totalStudents = await User.countDocuments({
      role: "student",
    });

    const activeBorrowings = await Borrow.countDocuments({
      status: "borrowed",
    });

    const returnedBooks = await Borrow.countDocuments({
      status: "returned",
    });

    const overdueBooks = await Borrow.countDocuments({
      status: "borrowed",
      dueDate: { $lt: new Date() },
    });

    const fineResult = await Borrow.aggregate([
      {
        $group: {
          _id: null,
          totalFine: {
            $sum: "$fine",
          },
        },
      },
    ]);

    const totalFineCollected =
      fineResult.length > 0 ? fineResult[0].totalFine : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalBooks,
        totalLibraries,
        totalStudents,
        activeBorrowings,
        returnedBooks,
        overdueBooks,
        totalFineCollected,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};