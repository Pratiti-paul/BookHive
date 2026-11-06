import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, CircleCheck, Clock3, History, IndianRupee, RotateCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import { EmptyState, ErrorState, SectionSkeleton } from "../../components/dashboard/DashboardState";
import { getMyBorrowedBooks, requestRenewal } from "../../services/borrowService";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not available";
const formatFine = (fine) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(fine || 0));

function StatusBadge({ borrow }) {
  if (borrow.status === "pending") {
    return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Pending Approval</span>;
  }
  if (borrow.status === "rejected") {
    return <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Request Rejected</span>;
  }
  if (borrow.status === "returned") {
    return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Returned</span>;
  }
  const dueDate = new Date(borrow.dueDate);
  const isLate = borrow.status === "overdue" || (borrow.status === "borrowed" && dueDate < new Date());
  const styles = isLate ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700";
  const label = isLate ? "Overdue" : "Active Loan";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function PendingRequestRow({ borrow }) {
  return (
    <article className="grid gap-4 border-b border-[#F3E8C8] px-4 py-5 last:border-0 md:grid-cols-[minmax(220px,1.65fr)_minmax(120px,.8fr)_minmax(130px,.8fr)_120px] md:items-center md:gap-5 md:px-5">
      <div className="flex min-w-0 gap-3">
        <div className="w-12 shrink-0">
          <BookCover book={borrow.book} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</p>
          <p className="mt-1 truncate text-sm text-gray-500">{borrow.book?.author || "Unknown author"}</p>
          <p className="mt-1 truncate text-xs text-gray-400">{borrow.library?.name || "Library unavailable"}</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Requested on</p>
        <p className="mt-1 text-sm font-medium text-gray-700 md:mt-0">{formatDate(borrow.requestDate || borrow.createdAt)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Status</p>
        <div className="mt-1 md:mt-0">
          <StatusBadge borrow={borrow} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Note</p>
        <span className="text-xs text-gray-500">Awaiting librarian review</span>
      </div>
    </article>
  );
}

function BorrowingRow({ borrow, onRenew, isRenewing = false }) {
  const dueDate = new Date(borrow.dueDate);
  const isLate = borrow.status === "overdue" || (borrow.status === "borrowed" && dueDate < new Date());

  const renderRenewalAction = () => {
    if (borrow.renewalStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800" title="Renewal request is under review by library staff.">
          <Clock3 size={13} />Renewal Pending
        </span>
      );
    }
    if (borrow.renewalStatus === "approved" || borrow.renewCount >= 1) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600" title="Loan has already been renewed once.">
          <CircleCheck size={13} />Renewed
        </span>
      );
    }
    if (isLate) {
      return (
        <button
          type="button"
          disabled
          title="Overdue books cannot be renewed online. Please return them to the library."
          className="inline-flex w-fit cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#F3E8C8] px-3 py-1.5 text-xs font-semibold text-gray-400 opacity-60"
        >
          <RotateCw size={13} />Renew
        </button>
      );
    }
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onRenew(borrow._id)}
          disabled={isRenewing}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#F3E8C8] bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
        >
          <RotateCw size={13} className={isRenewing ? "animate-spin" : ""} />
          {isRenewing ? "Requesting…" : "Request Renewal"}
        </button>
        {borrow.renewalStatus === "rejected" && (
          <span className="mt-1 text-[11px] text-red-600" title={borrow.renewalRejectionReason || "Renewal rejected"}>
            Renewal rejected
          </span>
        )}
      </div>
    );
  };

  return (
    <article className="grid gap-4 border-b border-[#F3E8C8] px-4 py-5 last:border-0 md:grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_140px] md:items-center md:gap-5 md:px-5">
      <div className="flex min-w-0 gap-3">
        <div className="w-12 shrink-0">
          <BookCover book={borrow.book} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</p>
          <p className="mt-1 truncate text-sm text-gray-500">{borrow.book?.author || "Unknown author"}</p>
          <p className="mt-1 truncate text-xs text-gray-400">{borrow.library?.name || "Library unavailable"}</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Status</p>
        <div className="mt-1 md:mt-0">
          <StatusBadge borrow={borrow} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Due date</p>
        <p className="mt-1 text-sm font-medium text-gray-700 md:mt-0">{formatDate(borrow.dueDate)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Fine</p>
        <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 md:mt-0">
          <IndianRupee size={14} />
          {formatFine(borrow.fine).replace("₹", "")}
        </p>
      </div>
      <div>{renderRenewalAction()}</div>
    </article>
  );
}

function HistoryRow({ borrow }) {
  const isRejected = borrow.status === "rejected";
  return (
    <article className="grid gap-4 border-b border-[#F3E8C8] px-4 py-5 last:border-0 md:grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_140px] md:items-center md:gap-5 md:px-5">
      <div className="flex min-w-0 gap-3">
        <div className="w-12 shrink-0">
          <BookCover book={borrow.book} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</p>
          <p className="mt-1 truncate text-sm text-gray-500">{borrow.book?.author || "Unknown author"}</p>
          <p className="mt-1 truncate text-xs text-gray-400">{borrow.library?.name || "Library unavailable"}</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Status</p>
        <div className="mt-1 md:mt-0">
          <StatusBadge borrow={borrow} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">{isRejected ? "Action Date" : "Returned on"}</p>
        <p className="mt-1 text-sm font-medium text-gray-700 md:mt-0">
          {formatDate(isRejected ? (borrow.actionDate || borrow.updatedAt) : borrow.returnDate)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 md:hidden">Fine</p>
        <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 md:mt-0">
          <IndianRupee size={14} />
          {formatFine(borrow.fine).replace("₹", "")}
        </p>
      </div>
      <div>
        {isRejected ? (
          <span className="text-xs text-red-600" title={borrow.rejectionReason || "Request declined"}>
            {borrow.rejectionReason ? `Reason: ${borrow.rejectionReason}` : "Declined by library"}
          </span>
        ) : (
          <span className="text-sm text-gray-500">Completed</span>
        )}
      </div>
    </article>
  );
}

function MyBorrowedBooks() {
  const [borrows, setBorrows] = useState([]);
  const [renewingId, setRenewingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBorrows = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getMyBorrowedBooks();
      setBorrows(data.borrows || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your borrowing history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadBorrows(); }, [loadBorrows]);

  const { pendingRequests, currentBorrowings, borrowingHistory } = useMemo(() => {
    const pending = [];
    const active = [];
    const history = [];

    borrows.forEach((borrow) => {
      if (borrow.status === "pending") {
        pending.push(borrow);
      } else if (borrow.status === "borrowed" || borrow.status === "overdue") {
        active.push(borrow);
      } else if (borrow.status === "returned" || borrow.status === "rejected") {
        history.push(borrow);
      }
    });

    return {
      pendingRequests: pending,
      currentBorrowings: active,
      borrowingHistory: history,
    };
  }, [borrows]);

  const handleRenewal = async (borrowId) => {
    setRenewingId(borrowId);
    try {
      await requestRenewal(borrowId);
      setBorrows((current) =>
        current.map((item) =>
          item._id === borrowId ? { ...item, renewalStatus: "pending" } : item
        )
      );
      toast.success("Renewal request submitted! Awaiting librarian approval.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to submit renewal request.");
    } finally {
      setRenewingId("");
    }
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <section className="flex flex-col gap-4 border-b border-[#F3E8C8] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-700">Your reading account</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">My Borrowed Books</h1>
            <p className="mt-2 text-gray-500">Track your borrow requests, active loans, return dates and history.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpen size={17} className="text-amber-700" />
            {isLoading ? "Loading…" : `${currentBorrowings.length} active loan${currentBorrowings.length === 1 ? "" : "s"}${pendingRequests.length > 0 ? ` · ${pendingRequests.length} pending` : ""}`}
          </div>
        </section>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="text-amber-700" size={20} />
              <div>
                <h2 className="font-semibold text-[#1F2937]">Pending Borrow Requests</h2>
                <p className="mt-0.5 text-sm text-gray-500">Requests awaiting approval from library staff.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(220px,1.65fr)_minmax(120px,.8fr)_minmax(130px,.8fr)_120px] gap-5 border-b border-[#F3E8C8] bg-[#FFFDF7] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
                <span>Book</span>
                <span>Requested on</span>
                <span>Status</span>
                <span>Note</span>
              </div>
              {pendingRequests.map((borrow) => (
                <PendingRequestRow key={borrow._id} borrow={borrow} />
              ))}
            </div>
          </section>
        )}

        {/* Current Borrowings Section */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="text-amber-700" size={20} />
            <div>
              <h2 className="font-semibold text-[#1F2937]">Current Borrowings</h2>
              <p className="mt-0.5 text-sm text-gray-500">Books that are currently checked out.</p>
            </div>
          </div>
          {isLoading ? (
            <SectionSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={loadBorrows} />
          ) : currentBorrowings.length === 0 ? (
            <EmptyState message="You have no current active borrowings." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_140px] gap-5 border-b border-[#F3E8C8] bg-[#FFFDF7] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
                <span>Book</span>
                <span>Status</span>
                <span>Due date</span>
                <span>Fine</span>
                <span>Renewal</span>
              </div>
              {currentBorrowings.map((borrow) => (
                <BorrowingRow
                  key={borrow._id}
                  borrow={borrow}
                  onRenew={handleRenewal}
                  isRenewing={renewingId === borrow._id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Borrowing History Section */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <History className="text-amber-700" size={20} />
            <div>
              <h2 className="font-semibold text-[#1F2937]">Borrowing History</h2>
              <p className="mt-0.5 text-sm text-gray-500">Completed loans and past request activity.</p>
            </div>
          </div>
          {isLoading ? (
            <SectionSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={loadBorrows} />
          ) : borrowingHistory.length === 0 ? (
            <EmptyState message="Returned books and past requests will appear here." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_140px] gap-5 border-b border-[#F3E8C8] bg-[#FFFDF7] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
                <span>Book</span>
                <span>Status</span>
                <span>Date</span>
                <span>Fine</span>
                <span>Record</span>
              </div>
              {borrowingHistory.map((borrow) => (
                <HistoryRow key={borrow._id} borrow={borrow} />
              ))}
            </div>
          )}
        </section>

        {!isLoading && !error && currentBorrowings.some((borrow) => borrow.status === "overdue") && (
          <div className="mt-8 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <Clock3 className="shrink-0 text-red-600" size={19} />
            <p className="text-sm leading-6 text-red-800">
              One or more books are overdue. Please contact your library to return them.
            </p>
          </div>
        )}

        {!isLoading && !error && borrows.length > 0 && (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <CircleCheck size={16} className="text-emerald-600" />
            Borrowing data is up to date.
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}

export default MyBorrowedBooks;
