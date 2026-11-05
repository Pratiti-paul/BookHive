import mongoose from "mongoose";
import Book from "./models/Book.js";
import Borrow from "./models/Borrow.js";
import Library from "./models/Library.js";
import User from "./models/User.js";
import { authorize, checkLibrarianLibrary, isAuthorizedForLibrary } from "./middleware/authMiddleware.js";
import { createBook, updateBook, deleteBook, getAllBooks } from "./controllers/bookController.js";
import { issueBook, getAllBorrowRecords, returnBook, renewBook } from "./controllers/borrowController.js";

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
const bookB = new mongoose.Types.ObjectId();
const studentId = new mongoose.Types.ObjectId();

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
  console.log("=== Running BookHive Multi-Tenancy & Security Verification ===\n");

  // Mock Book.findById
  const originalBookFindById = Book.findById;
  const originalBookFindOne = Book.findOne;
  const originalBorrowFind = Borrow.find;
  const originalBorrowFindById = Borrow.findById;
  const originalUserFindById = User.findById;
  const originalLibraryFindById = Library.findById;

  try {
    // SCENARIO 1: Librarian A attempts to update a book belonging to Library B
    console.log("Scenario 1: Librarian A attempts to update a book belonging to Library B");
    Book.findById = () => ({
      _id: bookB,
      title: "Clean Code",
      library: libB,
      isbn: "978-0132350884",
    });

    const req1 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { id: bookB.toString() },
      body: { title: "Hacked Title" },
    };
    const res1 = createMockResponse();
    await updateBook(req1, res1);
    assert(res1.statusCode === 403, `HTTP status is 403 (got ${res1.statusCode})`);
    assert(
      res1.body?.message?.includes("another library"),
      `Message rejects cross-library update: "${res1.body?.message}"`
    );

    // SCENARIO 2: Librarian A attempts to delete a book belonging to Library B
    console.log("\nScenario 2: Librarian A attempts to delete a book belonging to Library B");
    const req2 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      params: { id: bookB.toString() },
    };
    const res2 = createMockResponse();
    await deleteBook(req2, res2);
    assert(res2.statusCode === 403, `HTTP status is 403 (got ${res2.statusCode})`);
    assert(
      res2.body?.message?.includes("another library"),
      `Message rejects cross-library deletion: "${res2.body?.message}"`
    );

    // SCENARIO 3: Librarian A attempts to view borrow records (must be scoped to Library A)
    console.log("\nScenario 3: Librarian A views borrow records (data isolation)");
    let capturedBorrowQuery = null;
    Borrow.find = (query) => {
      capturedBorrowQuery = query;
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

    const req3 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      query: {},
    };
    const res3 = createMockResponse();
    await getAllBorrowRecords(req3, res3);
    assert(res3.statusCode === 200, `HTTP status is 200`);
    assert(
      capturedBorrowQuery?.library?.toString() === libA.toString(),
      `Borrow query strictly isolated to Library A (${capturedBorrowQuery?.library})`
    );

    // SCENARIO 4: Librarian A attempts to issue a book from Library B
    console.log("\nScenario 4: Librarian A attempts to issue a book belonging to Library B");
    User.findById = () => Promise.resolve({ _id: studentId, role: "student" });
    Library.findById = () => Promise.resolve({ _id: libA, name: "Library A" });
    Book.findById = () =>
      Promise.resolve({
        _id: bookB,
        title: "Clean Code",
        library: libB, // Belongs to Library B
        availableCopies: 3,
      });

    const req4 = {
      user: { _id: new mongoose.Types.ObjectId(), role: "librarian", library: libA },
      body: { studentId: studentId.toString(), bookId: bookB.toString(), libraryId: libA.toString() },
    };
    const res4 = createMockResponse();
    await issueBook(req4, res4);
    assert(
      res4.statusCode === 400 || res4.statusCode === 403,
      `Cross-library issue rejected with status ${res4.statusCode}`
    );
    assert(
      res4.body?.success === false,
      `Issue unsuccessful: "${res4.body?.message}"`
    );

    // SCENARIO 4B: Librarian A attempts to return / renew a borrow record from Library B
    console.log("\nScenario 4B: Librarian A attempts to return/renew a borrow belonging to Library B");
    const borrowB = new mongoose.Types.ObjectId();
    Borrow.findById = () =>
      Promise.resolve({
        _id: borrowB,
        library: libB, // Belongs to Library B
        book: bookB,
        student: studentId,
        status: "borrowed",
        dueDate: new Date(Date.now() + 86400000),
        renewCount: 0,
      });

    const req4Return = {
      user: { role: "librarian", library: libA },
      params: { borrowId: borrowB.toString() },
    };
    const res4Return = createMockResponse();
    await returnBook(req4Return, res4Return);
    assert(res4Return.statusCode === 403, `Return rejected with 403 for cross-library borrow (got ${res4Return.statusCode})`);

    const req4Renew = {
      user: { role: "librarian", library: libA },
      params: { borrowId: borrowB.toString() },
    };
    const res4Renew = createMockResponse();
    await renewBook(req4Renew, res4Renew);
    assert(res4Renew.statusCode === 403, `Renew rejected with 403 for cross-library borrow (got ${res4Renew.statusCode})`);

    // SCENARIO 5: Student attempts to access librarian-only endpoints
    console.log("\nScenario 5: Student attempts to access librarian-only endpoints");
    const authMiddleware = authorize("librarian", "admin");
    let middlewareCalledNext = false;
    const req5 = { user: { role: "student" } };
    const res5 = createMockResponse();
    authMiddleware(req5, res5, () => {
      middlewareCalledNext = true;
    });
    assert(res5.statusCode === 403, `HTTP status is 403 (got ${res5.statusCode})`);
    assert(middlewareCalledNext === false, `Next was not called`);
    assert(res5.body?.success === false, `Access rejected: "${res5.body?.message}"`);

    // SCENARIO 6: Admin accesses books and borrow records across libraries
    console.log("\nScenario 6: Admin accesses books and borrow records across libraries");
    Book.findById = () =>
      Promise.resolve({
        _id: bookB,
        title: "Clean Code",
        library: libB,
      });
    Book.findByIdAndUpdate = () => ({
      populate: () => ({
        populate: () =>
          Promise.resolve({
            _id: bookB,
            title: "Clean Code (Updated by Admin)",
            library: { name: "Library B" },
          }),
      }),
    });

    const req6 = {
      user: { role: "admin" },
      params: { id: bookB.toString() },
      body: { title: "Clean Code (Updated by Admin)" },
    };
    const res6 = createMockResponse();
    await updateBook(req6, res6);
    assert(res6.statusCode === 200, `Admin successfully updated book in Library B (got ${res6.statusCode})`);

    // Admin borrow query without filter allows cross-library access
    let adminBorrowQuery = null;
    Borrow.find = (query) => {
      adminBorrowQuery = query;
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
    const req6b = { user: { role: "admin" }, query: {} };
    const res6b = createMockResponse();
    await getAllBorrowRecords(req6b, res6b);
    assert(adminBorrowQuery?.library === undefined, `Admin query is unconstrained across libraries`);

    // SCENARIO 7: Librarian without an assigned library attempts management operations
    console.log("\nScenario 7: Librarian without an assigned library attempts management operations");
    const unassignedLibrarian = { _id: new mongoose.Types.ObjectId(), role: "librarian", library: null };

    const req7Create = {
      user: unassignedLibrarian,
      body: { title: "Test", author: "Author", isbn: "123", category: "General", totalCopies: 2 },
    };
    const res7Create = createMockResponse();
    await createBook(req7Create, res7Create);
    assert(res7Create.statusCode === 403, `Create book rejected with 403 for unassigned librarian`);

    const req7Borrow = { user: unassignedLibrarian, query: {} };
    const res7Borrow = createMockResponse();
    await getAllBorrowRecords(req7Borrow, res7Borrow);
    assert(res7Borrow.statusCode === 403, `View borrow records rejected with 403 for unassigned librarian`);

    // SCENARIO 8: Multi-library ISBN scoping check
    console.log("\nScenario 8: Library-scoped ISBN uniqueness check in controller");
    // Simulate book with same ISBN in Library A exists, but does not exist in Library B
    Book.findOne = ({ isbn, library }) => {
      if (isbn === "978-0132350884" && library?.toString() === libA.toString()) {
        return Promise.resolve({ title: "Clean Code in Lib A", library: libA });
      }
      return Promise.resolve(null);
    };

    // Attempt to add same ISBN to Library A -> Should reject as duplicate
    const req8Duplicate = {
      user: { role: "librarian", library: libA },
      body: { title: "Clean Code", author: "Robert Martin", isbn: "978-0132350884", category: "Tech", totalCopies: 1 },
    };
    const res8Duplicate = createMockResponse();
    await createBook(req8Duplicate, res8Duplicate);
    assert(res8Duplicate.statusCode === 400, `Duplicate ISBN within same library rejected (got ${res8Duplicate.statusCode})`);
    assert(res8Duplicate.body?.message?.includes("exists in this library"), `Error mentions library duplicate: "${res8Duplicate.body?.message}"`);

    // Attempt to add same ISBN to Library B -> Should allow (not rejected for duplicate)
    Book.create = (doc) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
    Book.findById = () => ({
      populate: () => ({
        populate: () =>
          Promise.resolve({
            title: "Clean Code",
            isbn: "978-0132350884",
            library: { name: "Library B" },
          }),
      }),
    });

    const req8Allowed = {
      user: { role: "librarian", library: libB },
      body: { title: "Clean Code", author: "Robert Martin", isbn: "978-0132350884", category: "Tech", totalCopies: 1 },
    };
    const res8Allowed = createMockResponse();
    await createBook(req8Allowed, res8Allowed);
    assert(res8Allowed.statusCode === 201, `Same ISBN allowed in Library B (got ${res8Allowed.statusCode})`);

  } finally {
    // Restore mocks
    Book.findById = originalBookFindById;
    Book.findOne = originalBookFindOne;
    Borrow.find = originalBorrowFind;
    Borrow.findById = originalBorrowFindById;
    User.findById = originalUserFindById;
    Library.findById = originalLibraryFindById;
  }

  console.log(`\n=== Verification Complete: ${testFailures === 0 ? "ALL TESTS PASSED ✅" : `${testFailures} FAILURES ❌`} ===`);
  if (testFailures > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
