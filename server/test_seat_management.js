import mongoose from "mongoose";
import Seat from "./models/Seat.js";
import Library from "./models/Library.js";
import SeatBooking from "./models/SeatBooking.js";
import Notification from "./models/Notification.js";
import {
  createSeat,
  getLibrarySeats,
  updateSeat,
  deleteSeat,
  configureBulkLayout,
  syncLibrarySeatCount,
} from "./controllers/seatController.js";
import { bookSeat } from "./controllers/seatBookingController.js";

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
const librarianA = new mongoose.Types.ObjectId();
const librarianB = new mongoose.Types.ObjectId();
const student1 = new mongoose.Types.ObjectId();
const admin1 = new mongoose.Types.ObjectId();
const seatId1 = new mongoose.Types.ObjectId();
const seatId2 = new mongoose.Types.ObjectId();

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
  console.log("=== Running BookHive Phase 3A Seat Management & Security Verification ===\n");

  const originalLibraryFindById = Library.findById;
  const originalLibraryFindByIdAndUpdate = Library.findByIdAndUpdate;
  const originalSeatCreate = Seat.create;
  const originalSeatFindOne = Seat.findOne;
  const originalSeatFind = Seat.find;
  const originalSeatFindById = Seat.findById;
  const originalSeatCountDocuments = Seat.countDocuments;
  const originalSeatBookingFindOne = SeatBooking.findOne;
  const originalSeatBookingCreate = SeatBooking.create;
  const originalSeatBookingCountDocuments = SeatBooking.countDocuments;
  const originalNotificationCreate = Notification.create;

  Notification.create = () => Promise.resolve({});

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Librarian A creates seats in Library A
    // -------------------------------------------------------------
    console.log("Scenario 1: Librarian A creates seats in Library A");
    Library.findById = (id) =>
      Promise.resolve({
        _id: libA,
        name: "North Branch",
        seatCount: 0,
      });

    Seat.findOne = () => Promise.resolve(null); // No duplicates

    let createdSeatDoc = null;
    Seat.create = (doc) => {
      createdSeatDoc = { ...doc, _id: seatId1 };
      return Promise.resolve(createdSeatDoc);
    };

    let syncedLibraryId = null;
    let syncedSeatCount = null;
    Seat.countDocuments = () => Promise.resolve(1);
    Library.findByIdAndUpdate = (id, update) => {
      syncedLibraryId = id;
      syncedSeatCount = update.seatCount;
      return Promise.resolve({ _id: id, ...update });
    };

    const req1 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      body: { seatNumber: "A-1", row: 1, column: 1, type: "window" },
    };
    const res1 = createMockResponse();

    await createSeat(req1, res1);
    assert(res1.statusCode === 201, `Status is 201 Created (got ${res1.statusCode})`);
    assert(createdSeatDoc.seatNumber === "A-1", `Seat number is A-1`);
    assert(createdSeatDoc.library.toString() === libA.toString(), `Seat belongs to Library A`);
    assert(createdSeatDoc.type === "window", `Seat type is window`);
    assert(syncedSeatCount === 1, `Library seatCount synchronized to 1`);

    // -------------------------------------------------------------
    // SCENARIO 2: Librarian A attempts to create seats in Library B
    // -------------------------------------------------------------
    console.log("\nScenario 2: Librarian A attempts to create seats in Library B");
    const req2 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      body: { libraryId: libB.toString(), seatNumber: "B-1", row: 1, column: 1 },
    };
    const res2 = createMockResponse();

    await createSeat(req2, res2);
    assert(res2.statusCode === 403, `Status is 403 Forbidden (got ${res2.statusCode})`);
    assert(
      res2.body?.message?.includes("another library"),
      `Rejected with cross-library message: "${res2.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 3: Librarian A attempts to update a seat in Library B
    // -------------------------------------------------------------
    console.log("\nScenario 3: Librarian A attempts to update a seat in Library B");
    const seatInLibB = {
      _id: seatId2,
      library: libB,
      seatNumber: "B-10",
      row: 2,
      column: 3,
      type: "regular",
      isActive: true,
      save: () => Promise.resolve(),
    };
    Seat.findById = () => Promise.resolve(seatInLibB);

    const req3 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      params: { id: seatId2.toString() },
      body: { type: "premium" },
    };
    const res3 = createMockResponse();

    await updateSeat(req3, res3);
    assert(res3.statusCode === 403, `Status is 403 Forbidden (got ${res3.statusCode})`);
    assert(
      res3.body?.message?.includes("another library"),
      `Message: "${res3.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 4: Student attempts to create a seat
    // -------------------------------------------------------------
    console.log("\nScenario 4: Student attempts to create a seat");
    const req4 = {
      user: { _id: student1, role: "student" },
      body: { seatNumber: "S-100", row: 5, column: 5 },
    };
    const res4 = createMockResponse();

    await createSeat(req4, res4);
    assert(res4.statusCode === 403, `Student creation returns 403 Forbidden (got ${res4.statusCode})`);

    // -------------------------------------------------------------
    // SCENARIO 5: Student retrieves a public seating layout
    // -------------------------------------------------------------
    console.log("\nScenario 5: Student retrieves public seating arrangement for a library");
    Library.findById = () => ({
      select: () =>
        Promise.resolve({
          _id: libA,
          name: "North Branch",
          seatCount: 10,
          openingHours: "09:00 AM - 08:00 PM",
        }),
    });

    const mockLayoutSeats = [
      { _id: seatId1, seatNumber: "A-1", row: 1, column: 1, type: "window", isActive: true },
      { _id: seatId2, seatNumber: "A-2", row: 1, column: 2, type: "regular", isActive: true },
    ];

    Seat.find = () => ({
      sort: () => Promise.resolve(mockLayoutSeats),
    });

    const req5 = {
      user: { _id: student1, role: "student" },
      params: { libraryId: libA.toString() },
      query: {},
    };
    const res5 = createMockResponse();

    await getLibrarySeats(req5, res5);
    assert(res5.statusCode === 200, `Status is 200 OK (got ${res5.statusCode})`);
    assert(res5.body?.count === 2, `Returned 2 seats`);
    assert(res5.body?.seats[0].seatNumber === "A-1", `First seat is A-1`);

    // -------------------------------------------------------------
    // SCENARIO 6: Admin manages seats across libraries
    // -------------------------------------------------------------
    console.log("\nScenario 6: Admin manages seats across libraries");
    Library.findById = (id) =>
      Promise.resolve({
        _id: libB,
        name: "South Central",
      });

    Seat.findOne = () => Promise.resolve(null);
    let adminCreatedSeat = null;
    Seat.create = (doc) => {
      adminCreatedSeat = { ...doc, _id: new mongoose.Types.ObjectId() };
      return Promise.resolve(adminCreatedSeat);
    };

    const req6 = {
      user: { _id: admin1, role: "admin" },
      body: { libraryId: libB.toString(), seatNumber: "ADMIN-1", row: 1, column: 1 },
    };
    const res6 = createMockResponse();

    await createSeat(req6, res6);
    assert(res6.statusCode === 201, `Admin creation returns 201 Created`);
    assert(
      adminCreatedSeat.library.toString() === libB.toString(),
      `Admin can target Library B`
    );

    // -------------------------------------------------------------
    // SCENARIO 7: Duplicate seat numbers are rejected within one library
    // -------------------------------------------------------------
    console.log("\nScenario 7: Duplicate seat numbers rejected within one library");
    Library.findById = () => Promise.resolve({ _id: libA });
    Seat.findOne = (query) => {
      if (query.seatNumber === "A-1") {
        return Promise.resolve({ _id: seatId1, seatNumber: "A-1", library: libA });
      }
      return Promise.resolve(null);
    };

    const req7 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      body: { seatNumber: "A-1", row: 2, column: 4 },
    };
    const res7 = createMockResponse();

    await createSeat(req7, res7);
    assert(res7.statusCode === 400, `Duplicate seatNumber returns 400 Bad Request`);
    assert(
      res7.body?.message?.includes("already exists in this library"),
      `Message: "${res7.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 8: Same seat numbers allowed in different libraries
    // -------------------------------------------------------------
    console.log("\nScenario 8: Same seat number allowed in different libraries");
    Library.findById = () => Promise.resolve({ _id: libB });
    // Seat "A-1" exists in Library A, but query for Library B returns null:
    Seat.findOne = (query) => {
      if (query.library.toString() === libB.toString()) {
        return Promise.resolve(null); // Not duplicate in Library B!
      }
      return Promise.resolve({ _id: seatId1, seatNumber: "A-1", library: libA });
    };

    let crossLibSeat = null;
    Seat.create = (doc) => {
      crossLibSeat = { ...doc, _id: new mongoose.Types.ObjectId() };
      return Promise.resolve(crossLibSeat);
    };

    const req8 = {
      user: { _id: librarianB, role: "librarian", library: libB },
      body: { seatNumber: "A-1", row: 1, column: 1 },
    };
    const res8 = createMockResponse();

    await createSeat(req8, res8);
    assert(res8.statusCode === 201, `Status is 201 Created for Library B`);
    assert(crossLibSeat.seatNumber === "A-1", `Library B successfully stocked seat A-1`);

    // -------------------------------------------------------------
    // SCENARIO 9: Duplicate row/column positions are rejected
    // -------------------------------------------------------------
    console.log("\nScenario 9: Duplicate row/column positions rejected within same library");
    Library.findById = () => Promise.resolve({ _id: libA });
    Seat.findOne = (query) => {
      if (query.row === 1 && query.column === 1) {
        return Promise.resolve({ _id: seatId1, row: 1, column: 1, library: libA });
      }
      return Promise.resolve(null);
    };

    const req9 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      body: { seatNumber: "DIFFERENT-NUMBER", row: 1, column: 1 },
    };
    const res9 = createMockResponse();

    await createSeat(req9, res9);
    assert(res9.statusCode === 400, `Duplicate position returns 400 Bad Request`);
    assert(
      res9.body?.message?.includes("already exists at row 1, column 1"),
      `Message: "${res9.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 10: Seats with active bookings cannot be deleted
    // -------------------------------------------------------------
    console.log("\nScenario 10: Seats with active bookings cannot be deleted");
    const seatWithActiveBooking = {
      _id: seatId1,
      library: libA,
      seatNumber: "A-1",
    };
    Seat.findById = () => Promise.resolve(seatWithActiveBooking);

    // Active booking found:
    SeatBooking.findOne = (query) => {
      if (query.status === "Booked") {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          seat: seatId1,
          status: "Booked",
        });
      }
      return Promise.resolve(null);
    };

    const req10 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      params: { id: seatId1.toString() },
    };
    const res10 = createMockResponse();

    await deleteSeat(req10, res10);
    assert(res10.statusCode === 400, `Status is 400 Bad Request (got ${res10.statusCode})`);
    assert(
      res10.body?.message?.includes("active bookings"),
      `Active booking deletion blocked: "${res10.body?.message}"`
    );

    // -------------------------------------------------------------
    // SCENARIO 11: Seats with historical bookings are deactivated
    // -------------------------------------------------------------
    console.log("\nScenario 11: Historical bookings trigger safe deactivation instead of hard delete");
    const seatWithHistory = {
      _id: seatId1,
      library: libA,
      seatNumber: "A-1",
      isActive: true,
      save: function () {
        return Promise.resolve(this);
      },
    };
    Seat.findById = () => Promise.resolve(seatWithHistory);

    // No active booking, but historical booking exists
    SeatBooking.findOne = (query) => {
      if (query.status === "Booked") return Promise.resolve(null);
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        seat: seatId1,
        status: "Completed",
      });
    };

    const res11 = createMockResponse();
    await deleteSeat(req10, res11);
    assert(res11.statusCode === 200, `Status is 200 OK`);
    assert(res11.body?.deactivated === true, `Seat was deactivated to preserve audit history`);
    assert(seatWithHistory.isActive === false, `seat.isActive set to false`);

    // -------------------------------------------------------------
    // SCENARIO 12: Bulk layout configuration generates grid and syncs seatCount
    // -------------------------------------------------------------
    console.log("\nScenario 12: Bulk layout configuration creates grid and syncs library seatCount");
    Library.findById = () => Promise.resolve({ _id: libA, name: "North Branch" });
    Seat.find = (query) => {
      if (query.library && query.isActive) {
        return {
          sort: () => Promise.resolve(Array.from({ length: 40 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), seatNumber: `S-${i+1}` }))),
        };
      }
      return Promise.resolve([]); // No prior seats
    };

    let bulkCreatedCount = 0;
    Seat.create = () => {
      bulkCreatedCount++;
      return Promise.resolve({ _id: new mongoose.Types.ObjectId() });
    };

    Seat.countDocuments = () => Promise.resolve(40);

    const req12 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      body: { rows: 5, columns: 8, prefix: "GRID", type: "regular" },
    };
    const res12 = createMockResponse();

    await configureBulkLayout(req12, res12);
    assert(res12.statusCode === 201, `Status is 201 Created for bulk layout`);
    assert(bulkCreatedCount === 40, `Created 40 seats for 5x8 grid`);
    assert(res12.body?.layout?.totalSeats === 40, `Layout totalSeats reported as 40`);

    // -------------------------------------------------------------
    // SCENARIO 13: Time-slot booking compatibility check
    // -------------------------------------------------------------
    console.log("\nScenario 13: Existing time-slot seat booking functionality remains compatible");
    Library.findById = () =>
      Promise.resolve({
        _id: libA,
        name: "North Branch",
        seatCount: 40,
        librarian: librarianA,
      });

    SeatBooking.findOne = () => Promise.resolve(null); // No duplicate user slot
    SeatBooking.countDocuments = () => Promise.resolve(5); // 5 booked out of 40

    let createdBooking = null;
    SeatBooking.create = (doc) => {
      createdBooking = { status: "Booked", ...doc, _id: new mongoose.Types.ObjectId() };
      return Promise.resolve(createdBooking);
    };

    const req13 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        date: "2026-12-01",
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res13 = createMockResponse();

    await bookSeat(req13, res13);
    assert(res13.statusCode === 201, `Legacy bookSeat returns 201 Created`);
    assert(createdBooking.status === "Booked", `Status is Booked`);
  } finally {
    // Restore original methods
    Library.findById = originalLibraryFindById;
    Library.findByIdAndUpdate = originalLibraryFindByIdAndUpdate;
    Seat.create = originalSeatCreate;
    Seat.findOne = originalSeatFindOne;
    Seat.find = originalSeatFind;
    Seat.findById = originalSeatFindById;
    Seat.countDocuments = originalSeatCountDocuments;
    SeatBooking.findOne = originalSeatBookingFindOne;
    SeatBooking.create = originalSeatBookingCreate;
    SeatBooking.countDocuments = originalSeatBookingCountDocuments;
    Notification.create = originalNotificationCreate;
  }

  console.log("\n========================================================");
  if (testFailures === 0) {
    console.log("🎉 ALL PHASE 3A SEAT MANAGEMENT TESTS PASSED!");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runTests();
