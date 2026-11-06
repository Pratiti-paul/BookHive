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
const reviewId1 = new mongoose.Types.ObjectId();
const reviewId2 = new mongoose.Types.ObjectId();
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
  console.log("=== Running BookHive Phase 2B.2 Wishlist & Reviews 15-Scenario Verification ===\n");

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
    // SCENARIO 1: Add a book to wishlist
    // -------------------------------------------------------------
    console.log("Scenario 1: Add a book to wishlist");
    Book.findById = (id) =>
      Promise.resolve({
        _id: bookId1,
        title: "The Pragmatic Programmer",
      });

    Wishlist.findOne = () => Promise.resolve(null);

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
    // SCENARIO 2: Add the same book twice
    // -------------------------------------------------------------
    console.log("\nScenario 2: Add the same book twice (duplicate prevention)");
    Wishlist.findOne = () => Promise.resolve(createdWishlistDoc);

    const res2 = createMockResponse();
    await addToWishlist(req1, res2);
    assert(res2.statusCode === 400, `Status is 400 Bad Request (got ${res2.statusCode})`);
    assert(
      res2.body?.message?.includes("already exists in wishlist"),
      `Rejects duplicate with message: "${res2.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 3: Remove a wishlist entry
    // -------------------------------------------------------------
    console.log("\nScenario 3: Remove a wishlist entry");
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
    // SCENARIO 4: Retrieve the student's own wishlist
    // -------------------------------------------------------------
    console.log("\nScenario 4: Retrieve the student's own wishlist (data isolation & deleted book handling)");
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
    console.log("\nScenario 5: Submit a review (borrow check & validation)");
    Book.findById = (id) =>
      Promise.resolve({
        _id: bookId1,
        title: "Clean Code",
        rating: 0,
        totalReviews: 0,
      });

    // 5a: Unborrowed book check
    Borrow.findOne = () => Promise.resolve(null);
    const req5 = {
      user: { _id: studentId1, role: "student" },
      body: { bookId: bookId1.toString(), rating: 5, comment: "Excellent" },
    };
    const res5a = createMockResponse();
    await createReview(req5, res5a);
    assert(res5a.statusCode === 403, `Unborrowed book review returns 403 (got ${res5a.statusCode})`);

    // 5b: Borrowed book review submission
    Borrow.findOne = () =>
      Promise.resolve({ student: studentId1, book: bookId1, status: "borrowed" });
    Review.findOne = () => Promise.resolve(null);

    let createdReviewDoc = null;
    Review.create = (doc) => {
      createdReviewDoc = { ...doc, _id: reviewId1 };
      return Promise.resolve(createdReviewDoc);
    };

    Review.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(createdReviewDoc),
      }),
      then: (resolve) => resolve(createdReviewDoc),
    });

    Review.find = (query) => Promise.resolve([createdReviewDoc]);

    let updatedBookStats = null;
    Book.findByIdAndUpdate = (id, update) => {
      updatedBookStats = update;
      return Promise.resolve({ _id: id, ...update });
    };

    const res5b = createMockResponse();
    await createReview(req5, res5b);
    assert(res5b.statusCode === 201, `Status is 201 Created (got ${res5b.statusCode})`);
    assert(createdReviewDoc.rating === 5, `Review rating recorded as 5`);

    // -------------------------------------------------------------
    // SCENARIO 6: Submit a duplicate review for the same book
    // -------------------------------------------------------------
    console.log("\nScenario 6: Submit a duplicate review for the same book");
    Review.findOne = () => Promise.resolve(createdReviewDoc);
    const res6 = createMockResponse();
    await createReview(req5, res6);
    assert(res6.statusCode === 400, `Duplicate review returns 400 Bad Request`);
    assert(
      res6.body?.message?.includes("already reviewed this book"),
      `Message: "${res6.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 7: Update an existing review
    // -------------------------------------------------------------
    console.log("\nScenario 7: Update an existing review");
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
    // SCENARIO 9: Delete an existing review
    // -------------------------------------------------------------
    console.log("\nScenario 9: Delete an existing review (ownership check & deletion)");
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

    // Unauthorized attempt
    const req9Unauthorized = {
      user: { _id: studentId2, role: "student" },
      params: { id: reviewId1.toString() },
    };
    const res9Unauthorized = createMockResponse();
    await deleteReview(req9Unauthorized, res9Unauthorized);
    assert(res9Unauthorized.statusCode === 403, `Unauthorized deletion rejected with 403`);

    // Authorized deletion
    Review.find = () => Promise.resolve([]);
    const req9 = {
      user: { _id: studentId1, role: "student" },
      params: { id: reviewId1.toString() },
    };
    const res9 = createMockResponse();
    await deleteReview(req9, res9);
    assert(res9.statusCode === 200, `Status is 200 OK (got ${res9.statusCode})`);
    assert(reviewDeleted, `Review successfully deleted`);

    // -------------------------------------------------------------
    // SCENARIO 10: Verify the book's average rating after creation
    // -------------------------------------------------------------
    console.log("\nScenario 10: Verify the book's average rating after creation");
    // 1 review of rating 5 -> average rating 5.0, count 1
    Review.find = () => Promise.resolve([{ rating: 5, book: bookId1 }]);
    const statsAfterCreate = await updateBookRatingStats(bookId1);
    assert(statsAfterCreate.rating === 5, `Rating after creation is 5`);
    assert(statsAfterCreate.totalReviews === 1, `totalReviews after creation is 1`);
    assert(updatedBookStats.rating === 5, `Database book rating is 5`);

    // -------------------------------------------------------------
    // SCENARIO 11: Verify the rating after editing
    // -------------------------------------------------------------
    console.log("\nScenario 11: Verify the rating after editing");
    // Review 1 edited from 5 to 4, plus another review of 2 -> (4 + 2) / 2 = 3.0
    Review.find = () =>
      Promise.resolve([
        { rating: 4, book: bookId1 },
        { rating: 2, book: bookId1 },
      ]);
    const statsAfterEdit = await updateBookRatingStats(bookId1);
    assert(statsAfterEdit.rating === 3, `Rating after editing is 3.0 (got ${statsAfterEdit.rating})`);
    assert(statsAfterEdit.totalReviews === 2, `totalReviews after editing is 2`);
    assert(updatedBookStats.rating === 3, `Database book rating updated to 3`);

    // -------------------------------------------------------------
    // SCENARIO 12: Verify the rating after deletion
    // -------------------------------------------------------------
    console.log("\nScenario 12: Verify the rating after deletion");
    // One review deleted, leaving only rating 4 -> average rating 4.0, count 1
    Review.find = () => Promise.resolve([{ rating: 4, book: bookId1 }]);
    const statsAfterDelete = await updateBookRatingStats(bookId1);
    assert(statsAfterDelete.rating === 4, `Rating after deletion is 4.0 (got ${statsAfterDelete.rating})`);
    assert(statsAfterDelete.totalReviews === 1, `totalReviews after deletion is 1`);
    assert(updatedBookStats.rating === 4, `Database book rating updated to 4`);

    // -------------------------------------------------------------
    // SCENARIO 13: Verify totalReviews when no reviews remain
    // -------------------------------------------------------------
    console.log("\nScenario 13: Verify totalReviews when no reviews remain (resets to 0)");
    Review.find = () => Promise.resolve([]);
    const statsEmpty = await updateBookRatingStats(bookId1);
    assert(statsEmpty.totalReviews === 0, `totalReviews resets to 0`);
    assert(statsEmpty.rating === 0, `Rating resets to 0`);
    assert(updatedBookStats.rating === 0, `Database book rating resets to 0`);
    assert(updatedBookStats.totalReviews === 0, `Database book totalReviews resets to 0`);

    // -------------------------------------------------------------
    // SCENARIO 14: Retrieve the student's own reviews
    // -------------------------------------------------------------
    console.log("\nScenario 14: Retrieve the student's own reviews (getMyReviews)");
    let capturedMyReviewsQuery = null;
    const mockStudentReviews = [
      {
        _id: reviewId1,
        student: studentId1,
        rating: 5,
        comment: "Excellent book!",
        book: {
          _id: bookId1,
          title: "Clean Code",
          author: "Robert C. Martin",
          rating: 4.5,
          totalReviews: 2,
        },
      },
      {
        _id: reviewId2,
        student: studentId1,
        rating: 4,
        comment: "Very helpful",
        book: null, // deleted book reference
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

    const req14 = {
      user: { _id: studentId1, role: "student" },
    };
    const res14 = createMockResponse();
    await getMyReviews(req14, res14);
    assert(res14.statusCode === 200, `Status is 200 OK (got ${res14.statusCode})`);
    assert(
      capturedMyReviewsQuery.student.toString() === studentId1.toString(),
      `Reviews query is strictly scoped to req.user._id`
    );
    assert(res14.body?.count === 1, `Deleted book review safely excluded (count: 1)`);
    assert(
      res14.body?.reviews[0].book.title === "Clean Code",
      `Book title populated: "${res14.body?.reviews[0].book.title}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 15: Verify students cannot access another student's reviews
    // -------------------------------------------------------------
    console.log("\nScenario 15: Verify students cannot access another student's reviews (isolation check)");
    // Student 2 tries to supply studentId1 in query/body
    let maliciousCapturedQuery = null;
    Review.find = (query) => {
      maliciousCapturedQuery = query;
      return {
        populate: () => ({
          sort: () => Promise.resolve([]),
        }),
      };
    };

    const req15 = {
      user: { _id: studentId2, role: "student" },
      query: { student: studentId1.toString(), studentId: studentId1.toString() },
      body: { student: studentId1.toString() },
      params: { studentId: studentId1.toString() },
    };
    const res15 = createMockResponse();
    await getMyReviews(req15, res15);
    assert(res15.statusCode === 200, `Status is 200 OK`);
    assert(
      maliciousCapturedQuery.student.toString() === studentId2.toString(),
      `Controller forces req.user._id (${studentId2}), ignoring external student parameter (${studentId1})`
    );
    assert(
      maliciousCapturedQuery.student.toString() !== studentId1.toString(),
      `Student 2 cannot read Student 1's reviews`
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
    console.log("🎉 ALL 15 PHASE 2B.2 SCENARIO TESTS PASSED!");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runTests();
