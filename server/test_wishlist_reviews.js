import mongoose from "mongoose";
import Book from "./models/Book.js";
import Borrow from "./models/Borrow.js";
import Review from "./models/Review.js";
import Wishlist from "./models/Wishlist.js";
import Notification from "./models/Notification.js";
import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
} from "./controllers/wishlistController.js";
import {
  createReview,
  getBookReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  updateBookRatingStats,
} from "./controllers/reviewController.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const studentId1 = new mongoose.Types.ObjectId();
const studentId2 = new mongoose.Types.ObjectId();
const bookId1 = new mongoose.Types.ObjectId();
const bookId2 = new mongoose.Types.ObjectId();
const reviewId1 = new mongoose.Types.ObjectId();
const wishlistId1 = new mongoose.Types.ObjectId();

let testFailures = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testFailures++;
  }
}

async function runTests() {
  console.log("=== Running BookHive Phase 2B.2 Wishlist & Reviews Verification ===\n");

  // Save original model methods
  const originalBookFindById = Book.findById;
  const originalBookFindByIdAndUpdate = Book.findByIdAndUpdate;
  const originalBorrowFindOne = Borrow.findOne;
  const originalWishlistFind = Wishlist.find;
  const originalWishlistFindOne = Wishlist.findOne;
  const originalWishlistCreate = Wishlist.create;
  const originalReviewFind = Review.find;
  const originalReviewFindOne = Review.findOne;
  const originalReviewFindById = Review.findById;
  const originalReviewCreate = Review.create;
  const originalNotificationCreate = Notification.create;

  Notification.create = () => Promise.resolve({});

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Add book to wishlist
    // -------------------------------------------------------------
    console.log("Scenario 1: Add book to wishlist");
    Book.findById = (id) =>
      Promise.resolve({
        _id: bookId1,
        title: "The Pragmatic Programmer",
      });

    Wishlist.findOne = () => Promise.resolve(null); // Not already in wishlist

    let createdWishlistDoc = null;
    Wishlist.create = (doc) => {
      createdWishlistDoc = { ...doc, _id: wishlistId1 };
      return Promise.resolve(createdWishlistDoc);
    };

    const req1 = {
      user: { _id: studentId1, role: "student" },
      params: { bookId: bookId1.toString() },
    };
    const res1 = createMockResponse();

    await addToWishlist(req1, res1);
    assert(res1.statusCode === 201, `Status is 201 Created (got ${res1.statusCode})`);
    assert(
      createdWishlistDoc.student.toString() === studentId1.toString(),
      `Wishlist associated with student`
    );
    assert(
      createdWishlistDoc.book.toString() === bookId1.toString(),
      `Wishlist references requested book`
    );

    // -------------------------------------------------------------
    // SCENARIO 2: Add duplicate wishlist entry
    // -------------------------------------------------------------
    console.log("\nScenario 2: Add duplicate wishlist entry");
    Wishlist.findOne = () => Promise.resolve(createdWishlistDoc);

    const res2 = createMockResponse();
    await addToWishlist(req1, res2);
    assert(res2.statusCode === 400, `Status is 400 Bad Request (got ${res2.statusCode})`);
    assert(
      res2.body?.message?.includes("already exists in wishlist"),
      `Rejects duplicate with message: "${res2.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 3: Remove wishlist entry
    // -------------------------------------------------------------
    console.log("\nScenario 3: Remove wishlist entry");
    let deletedWishlist = false;
    Wishlist.findOne = () =>
      Promise.resolve({
        _id: wishlistId1,
        student: studentId1,
        book: bookId1,
        deleteOne: () => {
          deletedWishlist = true;
          return Promise.resolve();
        },
      });

    const res3 = createMockResponse();
    await removeFromWishlist(req1, res3);
    assert(res3.statusCode === 200, `Status is 200 OK (got ${res3.statusCode})`);
    assert(deletedWishlist, `Wishlist document deleted successfully`);

    // Non-existent item removal
    Wishlist.findOne = () => Promise.resolve(null);
    const res3b = createMockResponse();
    await removeFromWishlist(req1, res3b);
    assert(res3b.statusCode === 404, `Non-existent wishlist item returns 404`);

    // -------------------------------------------------------------
    // SCENARIO 4: Retrieve own wishlist (with safe null-book handling)
    // -------------------------------------------------------------
    console.log("\nScenario 4: Retrieve own wishlist (scoped to student and handles deleted books)");
    let capturedWishlistQuery = null;
    const mockWishlistItems = [
      {
        _id: wishlistId1,
        student: studentId1,
        book: { _id: bookId1, title: "Active Book", status: "available" },
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentId1,
        book: null, // Deleted book reference
      },
    ];

    Wishlist.find = (query) => {
      capturedWishlistQuery = query;
      return {
        populate: () => ({
          sort: () => Promise.resolve(mockWishlistItems),
        }),
      };
    };

    const res4 = createMockResponse();
    await getMyWishlist(req1, res4);
    assert(res4.statusCode === 200, `Status is 200 OK (got ${res4.statusCode})`);
    assert(
      capturedWishlistQuery.student.toString() === studentId1.toString(),
      `Wishlist query strictly scoped to logged in student`
    );
    assert(res4.body?.count === 1, `Deleted/null book safely filtered out (count is 1)`);
    assert(res4.body?.wishlist[0].book.title === "Active Book", `Valid book returned`);

    // -------------------------------------------------------------
    // SCENARIO 5: Submit a review
    // -------------------------------------------------------------
    console.log("\nScenario 5: Submit a review with validation and borrow verification");
    Book.findById = (id) =>
      Promise.resolve({
        _id: bookId1,
        title: "Clean Code",
        rating: 0,
        totalReviews: 0,
      });

    // 5a: Student hasn't borrowed -> 403 Forbidden
    Borrow.findOne = () => Promise.resolve(null);
    const req5a = {
      user: { _id: studentId1, role: "student" },
      body: { bookId: bookId1.toString(), rating: 5, comment: "Excellent" },
    };
    const res5a = createMockResponse();
    await createReview(req5a, res5a);
    assert(res5a.statusCode === 403, `Unborrowed book review returns 403 (got ${res5a.statusCode})`);

    // 5b: Student has only a pending borrow request -> 403 Forbidden
    Borrow.findOne = () =>
      Promise.resolve({ student: studentId1, book: bookId1, status: "pending" });
    const res5b = createMockResponse();
    await createReview(req5a, res5b);
    assert(res5b.statusCode === 403, `Pending borrow review returns 403`);

    // 5c: Student has borrowed the book -> Valid submission
    Borrow.findOne = () =>
      Promise.resolve({ student: studentId1, book: bookId1, status: "borrowed" });
    Review.findOne = () => Promise.resolve(null); // No prior review

    let createdReviewDoc = null;
    Review.create = (doc) => {
      createdReviewDoc = { ...doc, _id: reviewId1 };
      return Promise.resolve(createdReviewDoc);
    };

    Review.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(createdReviewDoc),
      }),
    });

    Review.find = (query) => Promise.resolve([createdReviewDoc]);

    let updatedBookStats = null;
    Book.findByIdAndUpdate = (id, update) => {
      updatedBookStats = update;
      return Promise.resolve({ _id: id, ...update });
    };

    const res5c = createMockResponse();
    await createReview(req5a, res5c);
    assert(res5c.statusCode === 201, `Status is 201 Created (got ${res5c.statusCode})`);
    assert(createdReviewDoc.rating === 5, `Review rating recorded as 5`);
    assert(updatedBookStats.rating === 5, `Book rating updated to 5`);
    assert(updatedBookStats.totalReviews === 1, `Book totalReviews updated to 1`);

    // 5d: Invalid rating (< 1 or > 5)
    const req5d = {
      user: { _id: studentId1, role: "student" },
      body: { bookId: bookId1.toString(), rating: 6, comment: "Too high" },
    };
    const res5d = createMockResponse();
    await createReview(req5d, res5d);
    assert(res5d.statusCode === 400, `Rating > 5 rejected with 400`);

    // -------------------------------------------------------------
    // SCENARIO 6: Submit duplicate review for same book
    // -------------------------------------------------------------
    console.log("\nScenario 6: Submit duplicate review for same book");
    Review.findOne = () => Promise.resolve(createdReviewDoc);
    const res6 = createMockResponse();
    await createReview(req5a, res6);
    assert(res6.statusCode === 400, `Duplicate review returns 400 Bad Request`);
    assert(
      res6.body?.message?.includes("already reviewed this book"),
      `Message: "${res6.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 7: Update own review
    // -------------------------------------------------------------
    console.log("\nScenario 7: Update own review and recalculate book rating");
    const existingReview = {
      _id: reviewId1,
      student: studentId1,
      book: bookId1,
      rating: 5,
      comment: "Initial review",
      save: function () {
        return Promise.resolve(this);
      },
    };
    Review.findById = (id) => ({
      populate: () => ({
        populate: () => Promise.resolve(existingReview),
      }),
      then: (resolve) => resolve(existingReview),
    });
    Review.find = () =>
      Promise.resolve([{ ...existingReview, rating: 4, comment: "Updated review" }]);

    const req7 = {
      user: { _id: studentId1, role: "student" },
      params: { id: reviewId1.toString() },
      body: { rating: 4, comment: "Updated review" },
    };
    const res7 = createMockResponse();
    await updateReview(req7, res7);
    assert(res7.statusCode === 200, `Status is 200 OK (got ${res7.statusCode})`);
    assert(existingReview.rating === 4, `Review rating updated to 4`);
    assert(updatedBookStats.rating === 4, `Book rating recalculated to 4`);

    // -------------------------------------------------------------
    // SCENARIO 8: Attempt to update another student's review
    // -------------------------------------------------------------
    console.log("\nScenario 8: Attempt to update another student's review (ownership check)");
    const req8 = {
      user: { _id: studentId2, role: "student" },
      params: { id: reviewId1.toString() },
      body: { rating: 1, comment: "Malicious update" },
    };
    const res8 = createMockResponse();
    await updateReview(req8, res8);
    assert(res8.statusCode === 403, `Status is 403 Forbidden (got ${res8.statusCode})`);
    assert(
      res8.body?.message?.includes("not authorized"),
      `Unauthorized message: "${res8.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 9: Delete own review
    // -------------------------------------------------------------
    console.log("\nScenario 9: Delete own review (with ownership verification)");
    let reviewDeleted = false;
    const reviewToDelete = {
      _id: reviewId1,
      student: studentId1,
      book: bookId1,
      rating: 4,
      deleteOne: () => {
        reviewDeleted = true;
        return Promise.resolve();
      },
    };
    Review.findById = () => Promise.resolve(reviewToDelete);

    // Attempt delete by Student 2 -> 403
    const req9Unauthorized = {
      user: { _id: studentId2, role: "student" },
      params: { id: reviewId1.toString() },
    };
    const res9Unauthorized = createMockResponse();
    await deleteReview(req9Unauthorized, res9Unauthorized);
    assert(res9Unauthorized.statusCode === 403, `Unauthorized deletion rejected with 403`);

    // Valid delete by Student 1 -> 200
    Review.find = () => Promise.resolve([]); // 0 reviews remaining
    const req9 = {
      user: { _id: studentId1, role: "student" },
      params: { id: reviewId1.toString() },
    };
    const res9 = createMockResponse();
    await deleteReview(req9, res9);
    assert(res9.statusCode === 200, `Status is 200 OK (got ${res9.statusCode})`);
    assert(reviewDeleted, `Review successfully deleted`);

    // -------------------------------------------------------------
    // SCENARIO 10: Verify multi-review rating recalculation
    // -------------------------------------------------------------
    console.log("\nScenario 10: Multi-review rating calculation & decimal rounding");
    // Reviews with ratings 5, 4, 4 -> sum = 13, count = 3, avg = 4.3333 -> 4.3
    Review.find = () =>
      Promise.resolve([
        { rating: 5, book: bookId1 },
        { rating: 4, book: bookId1 },
        { rating: 4, book: bookId1 },
      ]);

    const stats10 = await updateBookRatingStats(bookId1);
    assert(stats10.totalReviews === 3, `Total reviews is 3`);
    assert(stats10.rating === 4.3, `Average rating rounded to 4.3 (got ${stats10.rating})`);
    assert(updatedBookStats.rating === 4.3, `Book updated with rating 4.3`);

    // -------------------------------------------------------------
    // SCENARIO 11: Verify review count when no reviews remain
    // -------------------------------------------------------------
    console.log("\nScenario 11: Zero reviews remaining resets rating and count to 0");
    Review.find = () => Promise.resolve([]);
    const stats11 = await updateBookRatingStats(bookId1);
    assert(stats11.totalReviews === 0, `Total reviews resets to 0`);
    assert(stats11.rating === 0, `Average rating resets to 0`);
    assert(updatedBookStats.rating === 0, `Book rating updated to 0`);
    assert(updatedBookStats.totalReviews === 0, `Book totalReviews updated to 0`);

    // -------------------------------------------------------------
    // SCENARIO 12: Retrieve own reviews (getMyReviews)
    // -------------------------------------------------------------
    console.log("\nScenario 12: Student retrieves their own reviews with populated book details");
    let capturedMyReviewsQuery = null;
    const mockStudentReviews = [
      {
        _id: reviewId1,
        student: studentId1,
        rating: 5,
        comment: "Loved this book!",
        book: {
          _id: bookId1,
          title: "Clean Code",
          author: "Robert C. Martin",
          rating: 4.3,
          totalReviews: 3,
        },
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentId1,
        rating: 4,
        comment: "Great book",
        book: null, // deleted book
      },
    ];

    Review.find = (query) => {
      capturedMyReviewsQuery = query;
      return {
        populate: () => ({
          sort: () => Promise.resolve(mockStudentReviews),
        }),
      };
    };

    const req12 = {
      user: { _id: studentId1, role: "student" },
    };
    const res12 = createMockResponse();
    await getMyReviews(req12, res12);
    assert(res12.statusCode === 200, `Status is 200 OK (got ${res12.statusCode})`);
    assert(
      capturedMyReviewsQuery.student.toString() === studentId1.toString(),
      `Reviews query strictly scoped to logged-in student`
    );
    assert(res12.body?.count === 1, `Orphaned review safely filtered out (count is 1)`);
    assert(
      res12.body?.reviews[0].book.title === "Clean Code",
      `Populated book details returned: "${res12.body?.reviews[0].book.title}"`
    );
  } finally {
    // Restore original methods
    Book.findById = originalBookFindById;
    Book.findByIdAndUpdate = originalBookFindByIdAndUpdate;
    Borrow.findOne = originalBorrowFindOne;
    Wishlist.find = originalWishlistFind;
    Wishlist.findOne = originalWishlistFindOne;
    Wishlist.create = originalWishlistCreate;
    Review.find = originalReviewFind;
    Review.findOne = originalReviewFindOne;
    Review.findById = originalReviewFindById;
    Review.create = originalReviewCreate;
    Notification.create = originalNotificationCreate;
  }

  console.log("\n========================================================");
  if (testFailures === 0) {
    console.log("🎉 ALL PHASE 2B.2 WISHLIST & REVIEWS TESTS PASSED!");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runTests();
