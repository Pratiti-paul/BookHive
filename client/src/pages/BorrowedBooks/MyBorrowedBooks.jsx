import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, CircleCheck, Clock3, History, IndianRupee, RotateCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import { EmptyState, ErrorState, SectionSkeleton } from "../../components/dashboard/DashboardState";
import { getMyBorrowedBooks } from "../../services/borrowService";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not available";
const formatFine = (fine) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(fine || 0));

function StatusBadge({ borrow }) {
  const dueDate = new Date(borrow.dueDate);
  const isLate = borrow.status === "overdue" || (borrow.status === "borrowed" && dueDate < new Date());
  const styles = borrow.status === "returned" ? "bg-emerald-50 text-emerald-700" : isLate ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";
  const label = borrow.status === "returned" ? "Returned" : isLate ? "Overdue" : "Borrowed";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function BorrowingRow({ borrow, history = false }) {
  return <article className="grid gap-4 border-b border-[#F3E8C8] px-4 py-5 last:border-0 md:grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_120px] md:items-center md:gap-5 md:px-5"><div className="flex min-w-0 gap-3"><div className="w-12 shrink-0"><BookCover book={borrow.book} /></div><div className="min-w-0"><p className="truncate font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</p><p className="mt-1 truncate text-sm text-gray-500">{borrow.book?.author || "Unknown author"}</p><p className="mt-1 truncate text-xs text-gray-400">{borrow.library?.name || "Library unavailable"}</p></div></div><div><p className="text-xs text-gray-500 md:hidden">Status</p><div className="mt-1 md:mt-0"><StatusBadge borrow={borrow} /></div></div><div><p className="text-xs text-gray-500 md:hidden">{history ? "Returned on" : "Due date"}</p><p className="mt-1 text-sm font-medium text-gray-700 md:mt-0">{formatDate(history ? borrow.returnDate : borrow.dueDate)}</p></div><div><p className="text-xs text-gray-500 md:hidden">Fine</p><p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 md:mt-0"><IndianRupee size={14} />{formatFine(borrow.fine).replace("₹", "")}</p></div>{history ? <p className="text-sm text-gray-500">Completed</p> : <button type="button" disabled title="Renewals are processed by library staff." className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#F3E8C8] px-3 py-2 text-sm font-semibold text-gray-400 opacity-70"><RotateCw size={15} />Renew</button>}</article>;
}

function MyBorrowedBooks() {
  const [borrows, setBorrows] = useState([]);
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

  const { currentBorrowings, returnedBooks } = useMemo(() => ({
    currentBorrowings: borrows.filter((borrow) => borrow.status !== "returned"),
    returnedBooks: borrows.filter((borrow) => borrow.status === "returned"),
  }), [borrows]);

  return <DashboardLayout><PageContainer>
    <section className="flex flex-col gap-4 border-b border-[#F3E8C8] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-amber-700">Your reading account</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">My Borrowed Books</h1><p className="mt-2 text-gray-500">Track your current loans, return dates and past borrowing activity.</p></div><div className="flex items-center gap-2 text-sm text-gray-600"><BookOpen size={17} className="text-amber-700" />{isLoading ? "Loading…" : `${currentBorrowings.length} active borrowing${currentBorrowings.length === 1 ? "" : "s"}`}</div></section>

    <section className="mt-8"><div className="mb-4 flex items-center gap-2"><CalendarClock className="text-amber-700" size={20} /><div><h2 className="font-semibold text-[#1F2937]">Current Borrowings</h2><p className="mt-0.5 text-sm text-gray-500">Books that are currently checked out.</p></div></div>{isLoading ? <SectionSkeleton count={3} /> : error ? <ErrorState message={error} onRetry={loadBorrows} /> : currentBorrowings.length === 0 ? <EmptyState message="You have no current borrowings." /> : <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white shadow-sm"><div className="hidden grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_120px] gap-5 border-b border-[#F3E8C8] bg-[#FFFDF7] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid"><span>Book</span><span>Status</span><span>Due date</span><span>Fine</span><span>Action</span></div>{currentBorrowings.map((borrow) => <BorrowingRow key={borrow._id} borrow={borrow} />)}</div>}</section>

    <section className="mt-10"><div className="mb-4 flex items-center gap-2"><History className="text-amber-700" size={20} /><div><h2 className="font-semibold text-[#1F2937]">Borrowing History</h2><p className="mt-0.5 text-sm text-gray-500">Books you have returned.</p></div></div>{isLoading ? <SectionSkeleton count={3} /> : error ? <ErrorState message={error} onRetry={loadBorrows} /> : returnedBooks.length === 0 ? <EmptyState message="Returned books will appear here after they are checked in." /> : <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white shadow-sm"><div className="hidden grid-cols-[minmax(220px,1.65fr)_minmax(110px,.8fr)_minmax(120px,.8fr)_minmax(90px,.55fr)_120px] gap-5 border-b border-[#F3E8C8] bg-[#FFFDF7] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid"><span>Book</span><span>Status</span><span>Returned on</span><span>Fine</span><span>Record</span></div>{returnedBooks.map((borrow) => <BorrowingRow key={borrow._id} borrow={borrow} history />)}</div>}</section>

    {!isLoading && !error && currentBorrowings.some((borrow) => borrow.status === "overdue") && <div className="mt-8 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4"><Clock3 className="shrink-0 text-red-600" size={19} /><p className="text-sm leading-6 text-red-800">One or more books are overdue. Please contact your library to return or renew them.</p></div>}
    {!isLoading && !error && borrows.length > 0 && <div className="mt-6 flex items-center gap-2 text-sm text-gray-500"><CircleCheck size={16} className="text-emerald-600" />Borrowing data is up to date.</div>}
  </PageContainer></DashboardLayout>;
}

export default MyBorrowedBooks;
