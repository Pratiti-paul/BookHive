import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCard from "../../components/Books/BookCard";
import FilterBar from "../../components/Books/FilterBar";
import { addToWishlist, getBooks, getLibraries, getWishlist } from "../../services/booksService";

const PAGE_SIZE = 12;
const INITIAL_FILTERS = { search: "", category: "", library: "", availability: "all", sort: "-createdAt" };

function BookGridSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[#F3E8C8] bg-white p-4"><div className="aspect-[3/4] rounded-lg bg-amber-100" /><div className="mt-4 h-4 w-3/4 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/2 rounded bg-gray-100" /><div className="mt-5 h-16 rounded bg-gray-100" /></div>)}</div>;
}

function Books() {
  const [books, setBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistedIds, setWishlistedIds] = useState(new Set());
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFilterData = useCallback(async () => {
    try {
      const [libraryData, wishlistData, categoryData] = await Promise.all([getLibraries(), getWishlist(), getBooks({ limit: 100, sort: "title" })]);
      setLibraries(libraryData.libraries || []);
      setWishlistedIds(new Set((wishlistData.wishlist || []).map((item) => item.book?._id || item.book)));
      setCategories([...new Set((categoryData.books || []).map((book) => book.category).filter(Boolean))].sort());
    } catch {
      // The primary catalogue request shows a retryable error if required data is unavailable.
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = { search: filters.search || undefined, category: filters.category || undefined, status: filters.availability === "all" ? undefined : filters.availability, sort: filters.sort };
      if (filters.library) {
        const response = await getBooks({ ...params, page: 1, limit: 100 });
        const libraryBooks = (response.books || []).filter((book) => (book.library?._id || book.library) === filters.library);
        const libraryTotalPages = Math.max(1, Math.ceil(libraryBooks.length / PAGE_SIZE));
        const activePage = Math.min(page, libraryTotalPages);
        setBooks(libraryBooks.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE));
        setTotalBooks(libraryBooks.length);
        setTotalPages(libraryTotalPages);
        if (activePage !== page) setPage(activePage);
      } else {
        const response = await getBooks({ ...params, page, limit: PAGE_SIZE });
        setBooks(response.books || []);
        setTotalBooks(response.totalBooks || 0);
        setTotalPages(response.totalPages || 1);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn’t load the book catalogue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadFilterData(); }, [loadFilterData]);
  useEffect(() => { loadBooks(); }, [loadBooks]);

  const libraryNames = useMemo(() => new Map(libraries.map((item) => [item._id, item.name])), [libraries]);
  const hasFilters = Object.entries(filters).some(([key, value]) => key === "availability" ? value !== "all" : key === "sort" ? value !== "-createdAt" : Boolean(value));
  const updateFilters = (nextFilters) => { setFilters(nextFilters); setPage(1); };
  const clearFilters = () => { setFilters(INITIAL_FILTERS); setPage(1); };
  const handleWishlist = async (bookId) => {
    try {
      await addToWishlist(bookId);
      setWishlistedIds((current) => new Set([...current, bookId]));
      toast.success("Book added to your wishlist.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update your wishlist.");
    }
  };

  return <DashboardLayout><PageContainer><section className="border-b border-[#F3E8C8] pb-8"><p className="text-sm font-medium text-amber-700">Discover your next read</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">Browse Books</h1><p className="mt-2 text-gray-500">Search the live catalogue across BookHive libraries.</p></section><div className="mt-7"><FilterBar filters={filters} categories={categories} libraries={libraries} onChange={updateFilters} /></div><div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm text-gray-500">{isLoading ? "Loading catalogue…" : `${totalBooks} book${totalBooks === 1 ? "" : "s"} found`}</p><div className="flex items-center gap-3"><SlidersHorizontal size={17} className="text-gray-500" />{hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"><X size={15} />Clear filters</button>}</div></div><section className="mt-4">{isLoading ? <BookGridSkeleton /> : error ? <div className="rounded-xl border border-red-100 bg-white px-6 py-14 text-center"><AlertCircle className="mx-auto text-red-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">Catalogue unavailable</h2><p className="mt-2 text-sm text-gray-500">{error}</p><button type="button" onClick={loadBooks} className="mt-5 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F59E0B]">Try again</button></div> : books.length === 0 ? <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white px-6 py-14 text-center"><BookOpen className="mx-auto text-amber-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">No books found</h2><p className="mt-2 text-sm text-gray-500">Try adjusting your search or filters.</p>{hasFilters && <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-amber-700">Clear all filters</button>}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map((book) => <BookCard key={book._id} book={book} libraryName={libraryNames.get(book.library?._id || book.library)} isWishlisted={wishlistedIds.has(book._id)} onWishlist={handleWishlist} />)}</div>}</section>{!isLoading && !error && totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Books pagination"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-[#F3E8C8] p-2 text-gray-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={18} /></button><span className="px-3 text-sm text-gray-600">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-lg border border-[#F3E8C8] p-2 text-gray-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={18} /></button></nav>}</PageContainer></DashboardLayout>;
}

export default Books;
