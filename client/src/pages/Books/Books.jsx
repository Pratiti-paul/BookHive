import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCard from "../../components/Books/BookCard";
import { addToWishlist, getBooks, getLibraries, getWishlist } from "../../services/booksService";

const PAGE_SIZE = 12;

function BookGridSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[#F3E8C8] bg-white p-4"><div className="aspect-[3/4] rounded-lg bg-amber-100" /><div className="mt-4 h-4 w-3/4 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/2 rounded bg-gray-100" /><div className="mt-5 h-9 rounded bg-gray-100" /></div>)}</div>;
}

function Books() {
  const [books, setBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [wishlistedIds, setWishlistedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [library, setLibrary] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const loadBooks = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [bookData, libraryData, wishlistData] = await Promise.all([
        getBooks({ limit: 100, sort: "-createdAt" }),
        getLibraries(),
        getWishlist(),
      ]);
      setBooks(bookData.books || []);
      setLibraries(libraryData.libraries || []);
      setWishlistedIds(new Set((wishlistData.wishlist || []).map((item) => item.book?._id || item.book)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn’t load the book catalogue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { setPage(1); }, [search, category, library, availability, sort]);

  const libraryNames = useMemo(() => new Map(libraries.map((item) => [item._id, item.name])), [libraries]);
  const categories = useMemo(() => [...new Set(books.map((book) => book.category).filter(Boolean))].sort(), [books]);
  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = books.filter((book) => {
      const searchMatch = !query || [book.title, book.author, book.isbn].some((value) => value?.toLowerCase().includes(query));
      const categoryMatch = !category || book.category === category;
      const libraryMatch = !library || book.library === library || book.library?._id === library;
      const available = book.availableCopies > 0 && book.status === "available";
      const availabilityMatch = availability === "all" || (availability === "available" && available) || (availability === "unavailable" && !available);
      return searchMatch && categoryMatch && libraryMatch && availabilityMatch;
    });
    return matches.sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title);
      if (sort === "oldest") return new Date(first.createdAt) - new Date(second.createdAt);
      if (sort === "availability") return second.availableCopies - first.availableCopies;
      return new Date(second.createdAt) - new Date(first.createdAt);
    });
  }, [availability, books, category, library, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const paginatedBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || category || library || availability !== "all" || sort !== "newest";

  const clearFilters = () => { setSearch(""); setCategory(""); setLibrary(""); setAvailability("all"); setSort("newest"); };
  const handleWishlist = async (bookId) => {
    try {
      await addToWishlist(bookId);
      setWishlistedIds((current) => new Set([...current, bookId]));
      toast.success("Book added to your wishlist.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update your wishlist.");
    }
  };

  return <DashboardLayout><PageContainer>
    <section className="border-b border-[#F3E8C8] pb-8"><p className="text-sm font-medium text-amber-700">Discover your next read</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">Browse Books</h1><p className="mt-2 text-gray-500">Search the live catalogue across BookHive libraries.</p></section>

    <section className="mt-7 rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4"><label className="flex items-center gap-3 rounded-xl border border-[#F3E8C8] bg-[#FFFDF7] px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100"><Search size={19} className="text-amber-700" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search by title, author or ISBN" className="min-w-0 flex-1 bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-gray-400" /></label><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="relative"><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full appearance-none rounded-lg border border-[#F3E8C8] bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-amber-400"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="sr-only">Filter by library</span><select value={library} onChange={(event) => setLibrary(event.target.value)} className="w-full rounded-lg border border-[#F3E8C8] bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-amber-400"><option value="">All libraries</option>{libraries.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span className="sr-only">Filter by availability</span><select value={availability} onChange={(event) => setAvailability(event.target.value)} className="w-full rounded-lg border border-[#F3E8C8] bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-amber-400"><option value="all">All availability</option><option value="available">Available now</option><option value="unavailable">Unavailable</option></select></label><label><span className="sr-only">Sort books</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full rounded-lg border border-[#F3E8C8] bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-amber-400"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="availability">Most available</option></select></label></div></div></section>

    <div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm text-gray-500">{isLoading ? "Loading catalogue…" : `${filteredBooks.length} book${filteredBooks.length === 1 ? "" : "s"} found`}</p><div className="flex items-center gap-3"><SlidersHorizontal size={17} className="text-gray-500" />{hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"><X size={15} />Clear filters</button>}</div></div>

    <section className="mt-4">{isLoading ? <BookGridSkeleton /> : error ? <div className="rounded-xl border border-red-100 bg-white px-6 py-14 text-center"><AlertCircle className="mx-auto text-red-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">Catalogue unavailable</h2><p className="mt-2 text-sm text-gray-500">{error}</p><button type="button" onClick={loadBooks} className="mt-5 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F59E0B]">Try again</button></div> : paginatedBooks.length === 0 ? <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white px-6 py-14 text-center"><BookOpen className="mx-auto text-amber-600" size={28} /><h2 className="mt-3 font-semibold text-[#1F2937]">No books found</h2><p className="mt-2 text-sm text-gray-500">Try adjusting your search or filters.</p>{hasFilters && <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-amber-700">Clear all filters</button>}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{paginatedBooks.map((book) => <BookCard key={book._id} book={book} libraryName={libraryNames.get(book.library?._id || book.library)} isWishlisted={wishlistedIds.has(book._id)} onWishlist={handleWishlist} />)}</div>}</section>

    {!isLoading && !error && filteredBooks.length > PAGE_SIZE && <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Books pagination"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-[#F3E8C8] p-2 text-gray-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={18} /></button><span className="px-3 text-sm text-gray-600">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-lg border border-[#F3E8C8] p-2 text-gray-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={18} /></button></nav>}
  </PageContainer></DashboardLayout>;
}

export default Books;
