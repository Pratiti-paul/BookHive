import mongoose from "mongoose";
import Seat from "./models/Seat.js";
import Library from "./models/Library.js";
import SeatBooking from "./models/SeatBooking.js";
import Notification from "./models/Notification.js";
import {
  bookSeat,
  getSeatAvailability,
  cancelBooking,
  completeBooking,
  checkSeatAvailability,
  isTimeOverlap,
} from "./controllers/seatBookingController.js";

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
const student2 = new mongoose.Types.ObjectId();
const admin1 = new mongoose.Types.ObjectId();
const seatIdA1 = new mongoose.Types.ObjectId();
const seatIdA2 = new mongoose.Types.ObjectId();
const seatIdB1 = new mongoose.Types.ObjectId();

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
  console.log("=== Running BookHive Phase 3B Individual Seat Reservation Verification ===\n");

  const originalLibraryFindById = Library.findById;
  const originalSeatFindById = Seat.findById;
  const originalSeatFind = Seat.find;
  const originalSeatFindOneAndUpdate = Seat.findOneAndUpdate;
  const originalSeatBookingFind = SeatBooking.find;
  const originalSeatBookingFindOne = SeatBooking.findOne;
  const originalSeatBookingFindById = SeatBooking.findById;
  const originalSeatBookingCreate = SeatBooking.create;
  const originalSeatBookingCountDocuments = SeatBooking.countDocuments;
  const originalSeatBookingFindByIdAndDelete = SeatBooking.findByIdAndDelete;
  const originalNotificationCreate = Notification.create;

  Notification.create = () => Promise.resolve({});

  // In-memory mock database for bookings
  let mockBookings = [];

  const libraryADoc = {
    _id: libA,
    name: "Central Library",
    status: "active",
    seatCount: 10,
    librarian: librarianA,
  };

  const libraryBDoc = {
    _id: libB,
    name: "West Branch Library",
    status: "active",
    seatCount: 10,
    librarian: librarianB,
  };

  const seatA1Doc = {
    _id: seatIdA1,
    library: libA,
    seatNumber: "A-1",
    row: 1,
    column: 1,
    type: "window",
    isActive: true,
    reservationVersion: 0,
  };

  const seatA2Doc = {
    _id: seatIdA2,
    library: libA,
    seatNumber: "A-2",
    row: 1,
    column: 2,
    type: "regular",
    isActive: true,
    reservationVersion: 0,
  };

  const seatB1Doc = {
    _id: seatIdB1,
    library: libB,
    seatNumber: "B-1",
    row: 1,
    column: 1,
    type: "regular",
    isActive: true,
    reservationVersion: 0,
  };

  const defaultSeats = [seatA1Doc, seatA2Doc];

  // Helper setup for standard mock implementations
  function setupStandardMocks() {
    mockBookings = [];

    Library.findById = (id) => {
      const idStr = id?.toString();
      if (idStr === libA.toString()) return Promise.resolve({ ...libraryADoc });
      if (idStr === libB.toString()) return Promise.resolve({ ...libraryBDoc });
      return Promise.resolve(null);
    };

    Seat.findById = (id) => {
      const idStr = id?.toString();
      if (idStr === seatIdA1.toString()) return Promise.resolve({ ...seatA1Doc });
      if (idStr === seatIdA2.toString()) return Promise.resolve({ ...seatA2Doc });
      if (idStr === seatIdB1.toString()) return Promise.resolve({ ...seatB1Doc });
      return Promise.resolve(null);
    };

    Seat.find = (query) => {
      let filtered = [...defaultSeats];
      if (query?.library) {
        filtered = filtered.filter(
          (s) => s.library.toString() === query.library.toString()
        );
      }
      if (query?.isActive !== undefined) {
        filtered = filtered.filter((s) => s.isActive === query.isActive);
      }
      return {
        sort: () => Promise.resolve(filtered),
      };
    };

    Seat.findOneAndUpdate = (query, update) => {
      return Promise.resolve({ _id: query._id });
    };

    SeatBooking.find = (query) => {
      let results = [...mockBookings];
      if (query?.seat) {
        results = results.filter(
          (b) => b.seat && b.seat.toString() === query.seat.toString()
        );
      }
      if (query?.student) {
        results = results.filter(
          (b) => b.student && b.student.toString() === query.student.toString()
        );
      }
      if (query?.library) {
        results = results.filter(
          (b) => b.library && b.library.toString() === query.library.toString()
        );
      }
      if (query?.status?.$in) {
        const allowed = query.status.$in.map((s) => s.toLowerCase());
        results = results.filter((b) => allowed.includes(b.status.toLowerCase()));
      }
      return Promise.resolve(results);
    };

    SeatBooking.findOne = (query) => {
      const item = mockBookings.find((b) => {
        if (query.student && b.student.toString() !== query.student.toString()) return false;
        if (query.library && b.library.toString() !== query.library.toString()) return false;
        if (query.date && b.date.toISOString().split("T")[0] !== new Date(query.date).toISOString().split("T")[0]) return false;
        if (query.startTime && b.startTime !== query.startTime) return false;
        if (query.endTime && b.endTime !== query.endTime) return false;
        if (query.status?.$in) {
          const allowed = query.status.$in.map((s) => s.toLowerCase());
          if (!allowed.includes(b.status.toLowerCase())) return false;
        }
        return true;
      });
      return Promise.resolve(item || null);
    };

    SeatBooking.findById = (id) => {
      const item = mockBookings.find((b) => b._id.toString() === id.toString());
      if (!item) return Promise.resolve(null);
      return Promise.resolve({
        ...item,
        save: function () {
          item.status = this.status;
          return Promise.resolve(item);
        },
      });
    };

    SeatBooking.create = (doc) => {
      const newBooking = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        status: "Booked",
        ...doc,
      };
      mockBookings.push(newBooking);
      return Promise.resolve(newBooking);
    };

    SeatBooking.countDocuments = (query) => {
      let count = mockBookings.length;
      return Promise.resolve(count);
    };

    SeatBooking.findByIdAndDelete = (id) => {
      mockBookings = mockBookings.filter((b) => b._id.toString() !== id.toString());
      return Promise.resolve({ _id: id });
    };
  }

  try {
    setupStandardMocks();

    const futureDate1 = "2026-12-10";
    const futureDate2 = "2026-12-11";

    // -------------------------------------------------------------
    // SCENARIO 1: Student reserves an available seat successfully
    // -------------------------------------------------------------
    console.log("Scenario 1: Student reserves an available seat successfully (201 Created)");
    const req1 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res1 = createMockResponse();
    await bookSeat(req1, res1);
    assert(res1.statusCode === 201, `Status is 201 Created (got ${res1.statusCode})`);
    assert(res1.body?.booking?.seat?.toString() === seatIdA1.toString(), "Booking references requested seat");
    assert(res1.body?.booking?.status === "Booked", "Booking status is Booked");

    // -------------------------------------------------------------
    // SCENARIO 2: Overlapping time interval rejection (409 Conflict)
    // -------------------------------------------------------------
    console.log("\nScenario 2: Reserving an already reserved seat for an overlapping interval is rejected (409 Conflict)");
    const req2 = {
      user: { _id: student2, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "11:00",
        endTime: "13:00", // Overlaps with 10:00 - 12:00
      },
    };
    const res2 = createMockResponse();
    await bookSeat(req2, res2);
    assert(res2.statusCode === 409, `Overlapping booking rejected with 409 Conflict (got ${res2.statusCode})`);
    assert(res2.body?.message?.includes("already reserved"), "Message indicates seat already reserved");

    // -------------------------------------------------------------
    // SCENARIO 3: Non-overlapping interval on same date succeeds
    // -------------------------------------------------------------
    console.log("\nScenario 3: Reserving the same seat for a non-overlapping interval on same date succeeds (201 Created)");
    const req3 = {
      user: { _id: student2, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "12:00", // Back-to-back: 12:00 to 14:00 does not conflict with 10:00 to 12:00
        endTime: "14:00",
      },
    };
    const res3 = createMockResponse();
    await bookSeat(req3, res3);
    assert(res3.statusCode === 201, `Non-overlapping interval returns 201 Created (got ${res3.statusCode})`);
    assert(res3.body?.booking?.startTime === "12:00", "Start time is 12:00");

    // -------------------------------------------------------------
    // SCENARIO 4: Same seat on different date succeeds
    // -------------------------------------------------------------
    console.log("\nScenario 4: Reserving the same seat on a different date succeeds (201 Created)");
    const req4 = {
      user: { _id: student2, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate2,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res4 = createMockResponse();
    await bookSeat(req4, res4);
    assert(res4.statusCode === 201, `Different date returns 201 Created (got ${res4.statusCode})`);

    // -------------------------------------------------------------
    // SCENARIO 5: Inactive seat reservation is rejected (400 Bad Request)
    // -------------------------------------------------------------
    console.log("\nScenario 5: Attempting to reserve an inactive seat is rejected (400 Bad Request)");
    const prevSeatFindById = Seat.findById;
    Seat.findById = (id) => Promise.resolve({ ...seatA1Doc, isActive: false });
    const req5 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "15:00",
        endTime: "17:00",
      },
    };
    const res5 = createMockResponse();
    await bookSeat(req5, res5);
    assert(res5.statusCode === 400, `Inactive seat rejected with 400 Bad Request (got ${res5.statusCode})`);
    assert(res5.body?.message?.includes("inactive"), "Message mentions inactive seat");

    // Restore Seat.findById
    Seat.findById = prevSeatFindById;

    // -------------------------------------------------------------
    // SCENARIO 6: Seat belonging to another library is rejected
    // -------------------------------------------------------------
    console.log("\nScenario 6: Reserving a seat belonging to another library is rejected (400 Bad Request)");
    const req6 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdB1.toString(), // belongs to libB!
        date: futureDate1,
        startTime: "15:00",
        endTime: "17:00",
      },
    };
    const res6 = createMockResponse();
    await bookSeat(req6, res6);
    assert(res6.statusCode === 400, `Cross-library seat rejected with 400 (got ${res6.statusCode})`);
    assert(res6.body?.message?.includes("does not belong to the selected library"), "Rejection message matches");

    // -------------------------------------------------------------
    // SCENARIO 7: Student concurrent overlapping booking rejected
    // -------------------------------------------------------------
    console.log("\nScenario 7: Student attempting two concurrent overlapping bookings is rejected (400 Bad Request)");
    // Ensure student1 has an existing active booking from 10:00 to 12:00 on futureDate1
    const req7 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA2.toString(), // different seat!
        date: futureDate1,
        startTime: "11:00", // overlaps student1's 10:00 - 12:00 booking
        endTime: "13:00",
      },
    };
    const res7 = createMockResponse();
    await bookSeat(req7, res7);
    assert(res7.statusCode === 400, `Student conflict rejected with 400 (got ${res7.statusCode})`);
    assert(res7.body?.message?.includes("already have an active seat reservation"), "Rejection message matches student conflict");

    // -------------------------------------------------------------
    // SCENARIO 8: Invalid time interval startTime >= endTime rejected
    // -------------------------------------------------------------
    console.log("\nScenario 8: Invalid time interval where startTime >= endTime is rejected (400 Bad Request)");
    const req8 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "16:00",
        endTime: "14:00",
      },
    };
    const res8 = createMockResponse();
    await bookSeat(req8, res8);
    assert(res8.statusCode === 400, `startTime >= endTime rejected with 400 (got ${res8.statusCode})`);
    assert(res8.body?.message?.includes("earlier than end time"), "Message indicates start time must be earlier");

    // -------------------------------------------------------------
    // SCENARIO 9: Invalid date/time format is rejected
    // -------------------------------------------------------------
    console.log("\nScenario 9: Invalid date/time format is rejected (400 Bad Request)");
    const req9 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: "not-a-valid-date",
        startTime: "99:99",
        endTime: "12:00",
      },
    };
    const res9 = createMockResponse();
    await bookSeat(req9, res9);
    assert(res9.statusCode === 400, `Invalid time format rejected with 400 (got ${res9.statusCode})`);

    // -------------------------------------------------------------
    // SCENARIO 10: Cancelling reservation releases seat
    // -------------------------------------------------------------
    console.log("\nScenario 10: Cancelling a reservation releases the seat for that time interval");
    setupStandardMocks();

    // Book seat for student1
    const req10a = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res10a = createMockResponse();
    await bookSeat(req10a, res10a);
    const bookingToCancel = res10a.body.booking;

    // Student cancels booking
    const req10b = {
      user: { _id: student1, role: "student" },
      params: { id: bookingToCancel._id.toString() },
    };
    const res10b = createMockResponse();
    await cancelBooking(req10b, res10b);
    assert(res10b.statusCode === 200, `Cancel returns 200 OK (got ${res10b.statusCode})`);
    assert(res10b.body?.booking?.status === "Cancelled", "Booking status updated to Cancelled");

    // Student 2 can now book the exact same slot
    const req10c = {
      user: { _id: student2, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res10c = createMockResponse();
    await bookSeat(req10c, res10c);
    assert(res10c.statusCode === 201, `Released slot booked successfully with 201 Created (got ${res10c.statusCode})`);

    // -------------------------------------------------------------
    // SCENARIO 11: Completed reservation does not block future bookings
    // -------------------------------------------------------------
    console.log("\nScenario 11: Completed reservation does not block bookings");
    setupStandardMocks();
    mockBookings.push({
      _id: new mongoose.Types.ObjectId(),
      student: student1,
      library: libA,
      seat: seatIdA1,
      date: new Date(futureDate1),
      startTime: "10:00",
      endTime: "12:00",
      status: "Completed",
    });

    const isAvailableCompleted = await checkSeatAvailability(seatIdA1, futureDate1, "10:00", "12:00");
    assert(isAvailableCompleted === true, "checkSeatAvailability returns true for slot with Completed booking");

    // -------------------------------------------------------------
    // SCENARIO 12: Librarian marks reservation as completed for their library
    // -------------------------------------------------------------
    console.log("\nScenario 12: Librarian can mark reservation as completed for their library");
    setupStandardMocks();
    const activeBookingDoc = {
      _id: new mongoose.Types.ObjectId(),
      student: student1,
      library: libA,
      seat: seatIdA1,
      date: new Date(futureDate1),
      startTime: "10:00",
      endTime: "12:00",
      status: "Booked",
    };
    mockBookings.push(activeBookingDoc);

    const req12 = {
      user: { _id: librarianA, role: "librarian", library: libA },
      params: { id: activeBookingDoc._id.toString() },
    };
    const res12 = createMockResponse();
    await completeBooking(req12, res12);
    assert(res12.statusCode === 200, `Librarian completion returns 200 OK (got ${res12.statusCode})`);
    assert(res12.body?.booking?.status === "Completed", "Booking status is Completed");

    // -------------------------------------------------------------
    // SCENARIO 13: Librarian A cannot complete reservation for Library B (403)
    // -------------------------------------------------------------
    console.log("\nScenario 13: Librarian from Library A cannot complete reservations for Library B (403 Forbidden)");
    setupStandardMocks();
    const libBBookingDoc = {
      _id: new mongoose.Types.ObjectId(),
      student: student1,
      library: libB,
      seat: seatIdB1,
      date: new Date(futureDate1),
      startTime: "10:00",
      endTime: "12:00",
      status: "Booked",
    };
    mockBookings.push(libBBookingDoc);

    const req13 = {
      user: { _id: librarianA, role: "librarian", library: libA }, // assigned to Lib A
      params: { id: libBBookingDoc._id.toString() }, // belongs to Lib B
    };
    const res13 = createMockResponse();
    await completeBooking(req13, res13);
    assert(res13.statusCode === 403, `Cross-library completion rejected with 403 Forbidden (got ${res13.statusCode})`);
    assert(res13.body?.message?.includes("permission to modify bookings for another library"), "Cross-library error message verified");

    // -------------------------------------------------------------
    // SCENARIO 14: Availability query returns status without student PII
    // -------------------------------------------------------------
    console.log("\nScenario 14: Availability endpoint returns status without exposing student identity");
    setupStandardMocks();
    // Book seat A1 from 10:00 to 12:00
    mockBookings.push({
      _id: new mongoose.Types.ObjectId(),
      student: student1,
      library: libA,
      seat: seatIdA1,
      date: new Date(futureDate1),
      startTime: "10:00",
      endTime: "12:00",
      status: "Booked",
    });

    const req14 = {
      query: {
        libraryId: libA.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res14 = createMockResponse();
    await getSeatAvailability(req14, res14);
    assert(res14.statusCode === 200, `Availability query returns 200 OK (got ${res14.statusCode})`);
    assert(res14.body?.totalSeats === 2, "totalSeats is 2");
    assert(res14.body?.availableSeats === 1, "availableSeats is 1");
    assert(res14.body?.bookedSeats === 1, "bookedSeats is 1");

    const seatA1Result = res14.body?.seats?.find((s) => s.seatNumber === "A-1");
    const seatA2Result = res14.body?.seats?.find((s) => s.seatNumber === "A-2");
    assert(seatA1Result?.isAvailable === false, "Seat A-1 is reported unavailable");
    assert(seatA2Result?.isAvailable === true, "Seat A-2 is reported available");

    // Verify student privacy: neither seat object nor response has student fields
    const hasStudentPII = res14.body?.seats?.some(
      (s) => s.student || s.studentId || s.email || s.name || s.bookingId
    );
    assert(hasStudentPII === false, "Privacy check passed: No student PII in seat availability response");

    // -------------------------------------------------------------
    // SCENARIO 15: Concurrency race condition protection
    // -------------------------------------------------------------
    console.log("\nScenario 15: High-concurrency race condition: exactly one succeeds, one rejected with 409");
    setupStandardMocks();

    let insertCount = 0;
    SeatBooking.create = (doc) => {
      insertCount++;
      const id = new mongoose.Types.ObjectId();
      const newBooking = {
        _id: id,
        createdAt: new Date(Date.now() + insertCount * 10), // second insert has later timestamp
        status: "Booked",
        ...doc,
      };
      mockBookings.push(newBooking);
      return Promise.resolve(newBooking);
    };

    const req15A = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const req15B = {
      user: { _id: student2, role: "student" },
      body: {
        libraryId: libA.toString(),
        seatId: seatIdA1.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };

    const res15A = createMockResponse();
    const res15B = createMockResponse();

    // Trigger both concurrently
    await Promise.all([bookSeat(req15A, res15A), bookSeat(req15B, res15B)]);

    const statuses = [res15A.statusCode, res15B.statusCode].sort();
    assert(statuses[0] === 201 && statuses[1] === 409, `Exactly one 201 Created and one 409 Conflict (got ${statuses.join(", ")})`);

    // Verify only 1 active booking remains in mock database for this slot
    const activeSeatA1Bookings = mockBookings.filter(
      (b) => b.seat && b.seat.toString() === seatIdA1.toString() && b.status === "Booked"
    );
    assert(activeSeatA1Bookings.length === 1, `Exactly 1 active booking retained after race resolution (got ${activeSeatA1Bookings.length})`);

    // -------------------------------------------------------------
    // SCENARIO 16: Legacy slot-based booking compatibility
    // -------------------------------------------------------------
    console.log("\nScenario 16: Legacy slot-based booking without seatId continues to work (backward compatibility)");
    setupStandardMocks();

    const req16 = {
      user: { _id: student1, role: "student" },
      body: {
        libraryId: libA.toString(),
        date: futureDate1,
        startTime: "10:00",
        endTime: "12:00",
      },
    };
    const res16 = createMockResponse();
    await bookSeat(req16, res16);
    assert(res16.statusCode === 201, `Legacy bookSeat returns 201 Created (got ${res16.statusCode})`);
    assert(res16.body?.booking?.status === "Booked", "Legacy booking status is Booked");
    assert(!res16.body?.booking?.seat, "Legacy booking seat is null/undefined");

  } finally {
    // Restore original model methods
    Library.findById = originalLibraryFindById;
    Seat.findById = originalSeatFindById;
    Seat.find = originalSeatFind;
    Seat.findOneAndUpdate = originalSeatFindOneAndUpdate;
    SeatBooking.find = originalSeatBookingFind;
    SeatBooking.findOne = originalSeatBookingFindOne;
    SeatBooking.findById = originalSeatBookingFindById;
    SeatBooking.create = originalSeatBookingCreate;
    SeatBooking.countDocuments = originalSeatBookingCountDocuments;
    SeatBooking.findByIdAndDelete = originalSeatBookingFindByIdAndDelete;
    Notification.create = originalNotificationCreate;
  }

  console.log("\n========================================================");
  if (testFailures === 0) {
    console.log("🎉 ALL 16 PHASE 3B SEAT RESERVATION TESTS PASSED!\n");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!\n`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
