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

    const mostBorrowedBooks = await Borrow.aggregate([
    {
        $group: {
        _id: "$book",
        borrowCount: {
            $sum: 1,
        },
        },
    },
    {
        $sort: {
        borrowCount: -1,
        },
    },
    {
        $limit: 5,
    },
    {
        $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book",
        },
    },
    {
        $unwind: "$book",
    },
    ]);

    const monthlyBorrowTrends = await Borrow.aggregate([
    {
        $group: {
        _id: {
            year: { $year: "$issueDate" },
            month: { $month: "$issueDate" },
        },
        borrowCount: {
            $sum: 1,
        },
        },
    },
    {
        $sort: {
        "_id.year": 1,
        "_id.month": 1,
        },
    },
    ]);


    const topActiveStudents = await Borrow.aggregate([
    {
        $group: {
        _id: "$student",
        totalBorrowed: {
            $sum: 1,
        },
        },
    },
    {
        $sort: {
        totalBorrowed: -1,
        },
    },
    {
        $limit: 5,
    },
    {
        $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "student",
        },
    },
    {
        $unwind: "$student",
    },
    ]);

    const libraryStatistics = await Borrow.aggregate([
  {
    $group: {
      _id: "$library",
      totalBorrowings: {
        $sum: 1,
      },
      activeBorrowings: {
        $sum: {
          $cond: [
            { $eq: ["$status", "borrowed"] },
            1,
            0,
          ],
        },
      },
      returnedBooks: {
        $sum: {
          $cond: [
            { $eq: ["$status", "returned"] },
            1,
            0,
          ],
        },
      },
      totalFineCollected: {
        $sum: "$fine",
      },
    },
  },
  {
    $lookup: {
      from: "libraries",
      localField: "_id",
      foreignField: "_id",
      as: "library",
    },
  },
  {
    $unwind: "$library",
  },
  {
    $project: {
      _id: 0,
      libraryName: "$library.name",
      city: "$library.city",
      totalBorrowings: 1,
      activeBorrowings: 1,
      returnedBooks: 1,
      totalFineCollected: 1,
    },
  },
  {
    $sort: {
      totalBorrowings: -1,
    },
  },
]);

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
        mostBorrowedBooks,
        monthlyBorrowTrends,
        topActiveStudents,
        libraryStatistics,
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