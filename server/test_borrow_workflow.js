import mongoose from "mongoose";
import Book from "./models/Book.js";
import Borrow from "./models/Borrow.js";
import Library from "./models/Library.js";
import User from "./models/User.js";
import Notification from "./models/Notification.js";
import {
  requestBorrow,
  getBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  requestRenewal,
  approveRenewalRequest,
  rejectRenewalRequest,
  returnBook,
  getMyBorrowedBooks,
} from "./controllers/borrowController.js";

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

const libA = new mongoose.Types.ObjectId();
const libB = new mongoose.Types.ObjectId();
const studentId1 = new mongoose.Types.ObjectId();
const studentId2 = new mongoose.Types.ObjectId();
const bookIdA = new mongoose.Types.ObjectId();
const bookIdB = new mongoose.Types.ObjectId();
const borrowId1 = new mongoose.Types.ObjectId();

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
  console.log("=== Running BookHive Phase 2B.1 Student Borrow Requests & Renewals Verification ===\n");

  // Save original Mongoose model methods
  const originalBookFindById = Book.findById;
  const originalBookFindOneAndUpdate = Book.findOneAndUpdate;
  const originalBorrowCreate = Borrow.create;
  const originalBorrowFindOne = Borrow.findOne;
  const originalBorrowFind = Borrow.find;
  const originalBorrowFindById = Borrow.findById;
  const originalLibraryFindById = Library.findById;
  const originalNotificationCreate = Notification.create;

  Notification.create = () => Promise.resolve({});

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Student creates borrow request for an available book
    // -------------------------------------------------------------
    console.log("Scenario 1: Student creates borrow request for an available book");
    Book.findById = (id) => ({
      populate: () =>
        Promise.resolve({
          _id: bookIdA,
          title: "Designing Data-Intensive Applications",
          library: { _id: libA, name: "Central Library" },
          availableCopies: 3,
          totalCopies: 5,
          status: "available",
        }),
    });

    Borrow.findOne = () => Promise.resolve(null); // No prior borrow

    let createdBorrowDoc = null;
    Borrow.create = (doc) => {
      createdBorrowDoc = {
        ...doc,
        _id: borrowId1,
      };
      return Promise.resolve(createdBorrowDoc);
    };

    Borrow.findById = (id) => ({
      populate: () => ({
        populate: () => Promise.resolve(createdBorrowDoc),
      }),
    });

    Library.findById = () => Promise.resolve({ _id: libA, librarian: null });

    const req1 = {
      user: { _id: studentId1, role: "student", name: "Alice Student" },
      body: { bookId: bookIdA.toString() },
    };
    const res1 = createMockResponse();

    await requestBorrow(req1, res1);
    assert(res1.statusCode === 201, `Status is 201 Created (got ${res1.statusCode})`);
    assert(createdBorrowDoc.status === "pending", `Borrow record is set to "pending"`);
    assert(
      createdBorrowDoc.library.toString() === libA.toString(),
      `Borrow record is associated with correct library`
    );

    // -------------------------------------------------------------
    // SCENARIO 2: Duplicate borrow request rejection
    // -------------------------------------------------------------
    console.log("\nScenario 2: Duplicate borrow request rejection");
    Borrow.findOne = () =>
      Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        student: studentId1,
        book: bookIdA,
        status: "pending",
      });

    const res2 = createMockResponse();
    await requestBorrow(req1, res2);
    assert(res2.statusCode === 400, `Status is 400 Bad Request (got ${res2.statusCode})`);
    assert(
      res2.body?.message?.includes("already have a pending borrow request"),
      `Rejects duplicate with message: "${res2.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 3: Request on unavailable book (0 copies)
    // -------------------------------------------------------------
    console.log("\nScenario 3: Request on unavailable book (0 copies)");
    Book.findById = () => ({
      populate: () =>
        Promise.resolve({
          _id: bookIdA,
          title: "Sold Out Book",
          library: { _id: libA },
          availableCopies: 0,
          status: "unavailable",
        }),
    });
    Borrow.findOne = () => Promise.resolve(null);

    const res3 = createMockResponse();
    await requestBorrow(req1, res3);
    assert(res3.statusCode === 400, `Status is 400 Bad Request (got ${res3.statusCode})`);
    assert(
      res3.body?.message?.includes("currently unavailable"),
      `Rejects with message: "${res3.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 4: Librarian requests listing data isolation
    // -------------------------------------------------------------
    console.log("\nScenario 4: Librarian views requests (isolated to librarian's assigned library)");
    let capturedListQuery = null;
    Borrow.find = (query) => {
      capturedListQuery = query;
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({
              sort: () => Promise.resolve([]),
            }),
          }),
        }),
      };
    };

    const req4 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      query: { status: "pending" },
    };
    const res4 = createMockResponse();
    await getBorrowRequests(req4, res4);
    assert(res4.statusCode === 200, `Status is 200 (got ${res4.statusCode})`);
    assert(
      capturedListQuery.library.toString() === libA.toString(),
      `Librarian query strictly filtered by library: ${capturedListQuery.library}`
    );
    assert(capturedListQuery.status === "pending", `Query filters by status "pending"`);

    // -------------------------------------------------------------
    // SCENARIO 5: Cross-library request approval rejection
    // -------------------------------------------------------------
    console.log("\nScenario 5: Cross-library request approval rejection (Librarian A cannot approve Library B)");
    const pendingBorrowLibB = {
      _id: borrowId1,
      student: studentId1,
      book: bookIdB,
      library: libB,
      status: "pending",
      save: () => Promise.resolve(),
    };
    Borrow.findById = () => Promise.resolve(pendingBorrowLibB);

    const req5 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { borrowId: borrowId1.toString() },
    };
    const res5 = createMockResponse();
    await approveBorrowRequest(req5, res5);
    assert(res5.statusCode === 403, `Status is 403 Forbidden (got ${res5.statusCode})`);
    assert(
      res5.body?.message?.includes("another library"),
      `Rejected with cross-library message: "${res5.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 6: Atomic inventory decrement on approval
    // -------------------------------------------------------------
    console.log("\nScenario 6: Atomic inventory decrement on librarian approval");
    let atomicFilter = null;
    let atomicUpdate = null;
    Book.findOneAndUpdate = (filter, update) => {
      atomicFilter = filter;
      atomicUpdate = update;
      return Promise.resolve({
        _id: bookIdA,
        title: "Designing Data-Intensive Applications",
        availableCopies: 2,
        status: "available",
      });
    };

    const pendingBorrowLibA = {
      _id: borrowId1,
      student: studentId1,
      book: bookIdA,
      library: libA,
      status: "pending",
      save: function () {
        return Promise.resolve(this);
      },
    };

    Borrow.findById = (id) => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(pendingBorrowLibA),
        }),
      }),
      then: (resolve) => resolve(pendingBorrowLibA),
    });

    const req6 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { borrowId: borrowId1.toString() },
    };
    const res6 = createMockResponse();
    await approveBorrowRequest(req6, res6);
    assert(res6.statusCode === 200, `Status is 200 OK (got ${res6.statusCode})`);
    assert(
      atomicFilter.availableCopies?.$gt === 0,
      `Atomic check verifies availableCopies > 0: ${JSON.stringify(atomicFilter.availableCopies)}`
    );
    assert(
      atomicUpdate.$inc?.availableCopies === -1,
      `Atomic update decrements availableCopies by 1: ${JSON.stringify(atomicUpdate.$inc)}`
    );
    assert(pendingBorrowLibA.status === "borrowed", `Borrow status transitioned to "borrowed"`);
    assert(Boolean(pendingBorrowLibA.dueDate), `Due date was calculated and set`);

    // -------------------------------------------------------------
    // SCENARIO 7: Rejection does not alter book inventory
    // -------------------------------------------------------------
    console.log("\nScenario 7: Rejection records reason and does NOT touch inventory");
    let bookInventoryTouched = false;
    Book.findOneAndUpdate = () => {
      bookInventoryTouched = true;
      return Promise.resolve({});
    };

    const pendingBorrowToReject = {
      _id: borrowId1,
      student: studentId1,
      book: bookIdA,
      library: libA,
      status: "pending",
      rejectionReason: null,
      save: function () {
        return Promise.resolve(this);
      },
    };

    Borrow.findById = (id) => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(pendingBorrowToReject),
        }),
      }),
      then: (resolve) => resolve(pendingBorrowToReject),
    });
    Book.findById = () => Promise.resolve({ title: "Test Book" });

    const req7 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { borrowId: borrowId1.toString() },
      body: { reason: "Reserved for faculty course reserve." },
    };
    const res7 = createMockResponse();
    await rejectBorrowRequest(req7, res7);
    assert(res7.statusCode === 200, `Status is 200 OK (got ${res7.statusCode})`);
    assert(pendingBorrowToReject.status === "rejected", `Borrow status transitioned to "rejected"`);
    assert(
      pendingBorrowToReject.rejectionReason === "Reserved for faculty course reserve.",
      `Rejection reason properly stored: "${pendingBorrowToReject.rejectionReason}"`
    );
    assert(!bookInventoryTouched, `Book inventory was NOT modified during rejection`);

    // -------------------------------------------------------------
    // SCENARIO 8: Student renewal request & student ownership
    // -------------------------------------------------------------
    console.log("\nScenario 8: Student renewal request, ownership check and renewal limits");
    const activeBorrow = {
      _id: borrowId1,
      student: studentId1,
      book: { _id: bookIdA, title: "Active Book" },
      library: { _id: libA, librarian: null },
      status: "borrowed",
      renewCount: 0,
      renewalStatus: "none",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future (not overdue)
      save: function () {
        return Promise.resolve(this);
      },
    };

    Borrow.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(activeBorrow),
      }),
    });

    // 8a: Student 2 attempts to renew Student 1's book -> 403 Forbidden
    const req8a = {
      user: { _id: studentId2, role: "student" },
      params: { borrowId: borrowId1.toString() },
    };
    const res8a = createMockResponse();
    await requestRenewal(req8a, res8a);
    assert(res8a.statusCode === 403, `Foreign student renewal rejected with 403 Forbidden (got ${res8a.statusCode})`);

    // 8b: Valid student renewal request
    const req8b = {
      user: { _id: studentId1, role: "student", name: "Alice Student" },
      params: { borrowId: borrowId1.toString() },
    };
    const res8b = createMockResponse();
    await requestRenewal(req8b, res8b);
    assert(res8b.statusCode === 200, `Valid student renewal returns 200 OK (got ${res8b.statusCode})`);
    assert(activeBorrow.renewalStatus === "pending", `Renewal status set to "pending"`);

    // 8c: Cannot renew again while renewalStatus is pending
    const res8c = createMockResponse();
    await requestRenewal(req8b, res8c);
    assert(res8c.statusCode === 400, `Duplicate renewal returns 400 (got ${res8c.statusCode})`);

    // 8d: Cannot renew if overdue
    activeBorrow.renewalStatus = "none";
    activeBorrow.dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days overdue
    const res8d = createMockResponse();
    await requestRenewal(req8b, res8d);
    assert(res8d.statusCode === 400, `Overdue renewal returns 400 Bad Request`);
    assert(
      res8d.body?.message?.includes("Overdue books cannot be renewed"),
      `Overdue message returned: "${res8d.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 9: Librarian approves renewal (extends loan by 14 days)
    // -------------------------------------------------------------
    console.log("\nScenario 9: Librarian approves renewal and extends due date");
    const futureDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const borrowAwaitingRenewal = {
      _id: borrowId1,
      student: studentId1,
      book: { _id: bookIdA, title: "Active Book" },
      library: libA,
      status: "borrowed",
      renewCount: 0,
      renewalStatus: "pending",
      dueDate: new Date(futureDue.getTime()),
      save: function () {
        return Promise.resolve(this);
      },
    };

    Borrow.findById = () => ({
      populate: () => Promise.resolve(borrowAwaitingRenewal),
    });

    // 9a: Librarian B cannot approve renewal for Library A
    const req9a = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libB },
      params: { borrowId: borrowId1.toString() },
    };
    const res9a = createMockResponse();
    await approveRenewalRequest(req9a, res9a);
    assert(res9a.statusCode === 403, `Cross-library renewal approval rejected with 403 Forbidden`);

    // 9b: Librarian A approves renewal
    const req9b = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { borrowId: borrowId1.toString() },
    };
    const res9b = createMockResponse();
    await approveRenewalRequest(req9b, res9b);
    assert(res9b.statusCode === 200, `Librarian renewal approval returns 200 OK`);
    assert(borrowAwaitingRenewal.renewalStatus === "approved", `Renewal status set to "approved"`);
    assert(borrowAwaitingRenewal.renewCount === 1, `Renew count incremented to 1`);
    const dayDiff = Math.round((borrowAwaitingRenewal.dueDate - futureDue) / (1000 * 60 * 60 * 24));
    assert(dayDiff === 14, `Due date extended by exactly 14 days (got +${dayDiff} days)`);

    // -------------------------------------------------------------
    // SCENARIO 10: Existing Return and Fine Calculation (£/₹ 10 per day)
    // -------------------------------------------------------------
    console.log("\nScenario 10: Preserved return functionality & fine calculation");
    const overdueDays = 3;
    const loanBook = {
      _id: bookIdA,
      title: "Clean Architecture",
      availableCopies: 1,
      status: "available",
      save: function () {
        return Promise.resolve(this);
      },
    };

    const overdueBorrow = {
      _id: borrowId1,
      student: studentId1,
      book: bookIdA,
      library: libA,
      status: "borrowed",
      dueDate: new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000), // 3 days overdue
      save: function () {
        return Promise.resolve(this);
      },
    };

    Borrow.findById = () => Promise.resolve(overdueBorrow);
    Book.findById = () => Promise.resolve(loanBook);

    const req10 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { borrowId: borrowId1.toString() },
    };
    const res10 = createMockResponse();
    await returnBook(req10, res10);
    assert(res10.statusCode === 200, `Return book returns 200 OK`);
    assert(overdueBorrow.status === "returned", `Borrow status updated to "returned"`);
    assert(loanBook.availableCopies === 2, `Available copies safely incremented by 1 (was 1, now 2)`);
    assert(
      overdueBorrow.fine === overdueDays * 10,
      `Overdue fine calculated correctly: ₹${overdueBorrow.fine} for ${overdueDays} days overdue`
    );

    // -------------------------------------------------------------
    // SCENARIO 11: Student views their own borrowings only
    // -------------------------------------------------------------
    console.log("\nScenario 11: Student views their own borrowings only");
    let studentMyBooksQuery = null;
    Borrow.find = (query) => {
      studentMyBooksQuery = query;
      return {
        populate: () => ({
          populate: () => ({
            sort: () => Promise.resolve([]),
          }),
        }),
      };
    };

    const req11 = {
      user: { _id: studentId1, role: "student" },
    };
    const res11 = createMockResponse();
    await getMyBorrowedBooks(req11, res11);
    assert(res11.statusCode === 200, `My books returns 200 OK`);
    assert(
      studentMyBooksQuery.student.toString() === studentId1.toString(),
      `Student query is strictly scoped to req.user._id`
    );

  } finally {
    // Restore original methods
    Book.findById = originalBookFindById;
    Book.findOneAndUpdate = originalBookFindOneAndUpdate;
    Borrow.create = originalBorrowCreate;
    Borrow.findOne = originalBorrowFindOne;
    Borrow.find = originalBorrowFind;
    Borrow.findById = originalBorrowFindById;
    Library.findById = originalLibraryFindById;
    Notification.create = originalNotificationCreate;
  }

  console.log("\n========================================================");
  if (testFailures === 0) {
    console.log("🎉 ALL PHASE 2B.1 WORKFLOW & SECURITY TESTS PASSED!");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runTests();
