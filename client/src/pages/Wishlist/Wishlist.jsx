import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, Heart, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import useAuth from "../../hooks/useAuth";
import { getWishlist, removeFromWishlist } from "../../services/booksService";
import { getMyBorrowedBooks, requestBorrow } from "../../services/borrowService";

function WishlistSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[#F3E8C8] bg-white p-4"><div className="aspect-[3/4] rounded-lg bg-amber-100" /><div className="mt-4 h-4 w-3/4 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/2 rounded bg-gray-100" /><div className="mt-5 h-9 rounded bg-gray-100" /></div>)}</div>;
}

function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [borrowStatusMap, setBorrowStatusMap] = useState(new Map());
  const [borrowingId, setBorrowingId] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  const loadWishlist = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const calls = [getWishlist()];
      if (user) {
        calls.push(getMyBorrowedBooks());
      }
      const results = await Promise.allSettled(calls);
      const wishlistData = results[0].status === "fulfilled" ? results[0].value : {};
      const borrowData = user && results[1]?.status === "fulfilled" ? results[1].value : {};

      setItems(wishlistData.wishlist || []);

      if (borrowData.borrows) {
        const statusMap = new Map();
        borrowData.borrows.forEach((item) => {
          const bId = item.book?._id || item.book;
          if (item.status === "borrowed" || item.status === "pending") {
            statusMap.set(bId.toString(), item.status);
          }
        });
        setBorrowStatusMap(statusMap);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your wishlist.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(({ book }) => [book?.title, book?.author, book?.category].some((value) => value?.toLowerCase().includes(query)));
  }, [items, search]);

  const handleRemove = async (bookId) => {
    setRemovingId(bookId);
    try {
      await removeFromWishlist(bookId);
      setItems((current) => current.filter((item) => (item.book?._id || item.book) !== bookId));
      toast.success("Book removed from your wishlist.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update your wishlist.");
    } finally {
      setRemovingId("");
    }
  };

  const handleBorrow = async (bookId) => {
    setBorrowingId(bookId);
    try {
      await requestBorrow(bookId);
      setBorrowStatusMap((prev) => new Map(prev).set(bookId.toString(), "pending"));
      toast.success("Borrow request submitted! Awaiting librarian approval.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to submit borrow request.");
    } finally {
      setBorrowingId("");
    }
  };

  return <DashboardLayout><PageContainer>
    <section className="flex flex-col gap-4 border-b border-[#F3E8C8] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-amber-700">Books saved for later</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">My Wishlist</h1><p className="mt-2 text-gray-500">Keep track of titles you want to read next.</p></div><p className="inline-flex items-center gap-2 text-sm text-gray-600"><Heart size={17} className="text-amber-700" />{isLoading ? "Loading…" : `${items.length} saved book${items.length === 1 ? "" : "s"}`}</p></section>

    <section className="mt-7"><label className="flex items-center gap-3 rounded-xl border border-[#F3E8C8] bg-white px-4 py-3 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100"><Search size={19} className="text-amber-700" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your wishlist" className="min-w-0 flex-1 bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-gray-400" /></label></section>

    <section className="mt-7">{isLoading ? <WishlistSkeleton /> : error ? <div className="rounded-xl border border-red-100 bg-white px-6 py-14 text-center"><AlertCircle className="mx-auto text-red-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">Wishlist unavailable</h2><p className="mt-2 text-sm text-gray-500">{error}</p><button type="button" onClick={loadWishlist} className="mt-5 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F59E0B]">Try again</button></div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white px-6 py-16 text-center"><Heart className="mx-auto text-amber-600" size={30} /><h2 className="mt-4 font-semibold text-[#1F2937]">Your wishlist is empty</h2><p className="mt-2 text-sm text-gray-500">Save books while browsing to find them here later.</p><Link to="/books" className="mt-5 inline-flex rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F59E0B]">Browse Books</Link></div> : visibleItems.length === 0 ? <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white px-6 py-14 text-center"><Search className="mx-auto text-amber-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">No saved books match your search</h2><button type="button" onClick={() => setSearch("")} className="mt-4 text-sm font-semibold text-amber-700">Clear search</button></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleItems.map((item) => { const book = item.book; const bookId = book?._id || book; const available = book?.availableCopies > 0 && book?.status === "available"; return <article key={item._id} className="flex flex-col rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><BookCover book={book} /><div className="mt-4 flex flex-1 flex-col"><h2 className="truncate font-semibold text-[#1F2937]">{book?.title || "Book unavailable"}</h2><p className="mt-1 truncate text-sm text-gray-500">{book?.author || "Unknown author"}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="truncate rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">{book?.category || "General"}</span><span className={`text-xs font-medium ${available ? "text-emerald-700" : "text-red-700"}`}>{available ? `${book.availableCopies} available` : "Unavailable"}</span></div><div className="mt-5 grid grid-cols-3 gap-2"><Link to={`/books/${bookId}`} className="inline-flex items-center justify-center rounded-lg border border-[#F3E8C8] px-2 py-2 text-xs font-semibold text-gray-700 transition hover:bg-amber-50" aria-label={`View details for ${book?.title || "book"}`}><BookOpen size={16} /></Link>                      <button type="button" onClick={() => handleRemove(bookId)} disabled={removingId === bookId} className="inline-flex items-center justify-center rounded-lg border border-red-100 px-2 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50" aria-label={`Remove ${book?.title || "book"} from wishlist`}><Trash2 size={16} /></button>
                      {(() => {
                        const status = borrowStatusMap.get(bookId?.toString());
                        if (status === "pending") {
                          return (
                            <span className="inline-flex items-center justify-center rounded-lg bg-amber-100 px-2 py-2 text-xs font-semibold text-amber-800" title="Your borrow request is pending librarian approval.">
                              Requested
                            </span>
                          );
                        }
                        if (status === "borrowed") {
                          return (
                            <span className="inline-flex items-center justify-center rounded-lg bg-emerald-100 px-2 py-2 text-xs font-semibold text-emerald-800" title="You currently have this book borrowed.">
                              Borrowed
                            </span>
                          );
                        }
                        if (!available) {
                          return (
                            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-400">
                              Unavailable
                            </button>
                          );
                        }
                        if (user?.role === "student") {
                          return (
                            <button
                              type="button"
                              onClick={() => handleBorrow(bookId)}
                              disabled={borrowingId === bookId}
                              className="rounded-lg bg-[#F4B400] px-2 py-2 text-xs font-semibold text-[#1F2937] transition hover:bg-[#F59E0B] disabled:opacity-50"
                            >
                              {borrowingId === bookId ? "Requesting…" : "Borrow"}
                            </button>
                          );
                        }
                        return (
                          <Link
                            to={`/books/${bookId}`}
                            className="inline-flex items-center justify-center rounded-lg bg-[#F4B400] px-2 py-2 text-xs font-semibold text-[#1F2937] transition hover:bg-[#F59E0B]"
                          >
                            Borrow
                          </Link>
                        );
                      })()}
                    </div></div></article>; })}</div>}</section>
  </PageContainer></DashboardLayout>;
}

export default Wishlist;
