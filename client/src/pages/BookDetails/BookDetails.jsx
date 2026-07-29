import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Heart, LibraryBig, Sparkles, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import { addToWishlist, getBookById, getBookReviews, getBooks } from "../../services/booksService";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "";

function RatingStars({ value, size = 17 }) {
  return <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={size} className={star <= Math.round(value) ? "fill-[#FFCC33] text-[#FFCC33]" : "text-gray-200"} />)}</span>;
}

function DetailSkeleton() {
  return <div className="grid animate-pulse gap-8 rounded-xl border border-[#F3E8C8] bg-white p-6 md:grid-cols-[220px_1fr]"><div className="aspect-[3/4] rounded-lg bg-amber-100" /><div><div className="h-8 w-2/3 rounded bg-gray-100" /><div className="mt-4 h-4 w-1/3 rounded bg-gray-100" /><div className="mt-8 h-24 rounded bg-gray-100" /></div></div>;
}

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [errors, setErrors] = useState({ book: "", reviews: "", related: "" });
  const [isLoading, setIsLoading] = useState(true);

  const loadBook = useCallback(async () => {
    setIsLoading(true);
    setErrors({ book: "", reviews: "", related: "" });
    try {
      const bookData = await getBookById(id);
      setBook(bookData.book);

      const [reviewsResult, relatedResult] = await Promise.allSettled([
        getBookReviews(id),
        getBooks({ category: bookData.book.category, limit: 8, sort: "-createdAt" }),
      ]);

      if (reviewsResult.status === "fulfilled") setReviews(reviewsResult.value.reviews || []);
      else setErrors((current) => ({ ...current, reviews: reviewsResult.reason.response?.data?.message || "Reviews could not be loaded." }));

      if (relatedResult.status === "fulfilled") setRelatedBooks((relatedResult.value.books || []).filter((item) => item._id !== id).slice(0, 4));
      else setErrors((current) => ({ ...current, related: relatedResult.reason.response?.data?.message || "Related books could not be loaded." }));
    } catch (requestError) {
      setErrors((current) => ({ ...current, book: requestError.response?.data?.message || "Unable to load this book." }));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadBook(); }, [loadBook]);

  const saveToWishlist = async () => {
    try { await addToWishlist(book._id); toast.success("Book added to your wishlist."); } catch (requestError) { toast.error(requestError.response?.data?.message || "Unable to update your wishlist."); }
  };

  const averageRating = useMemo(() => reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : null, [reviews]);

  if (isLoading) return <DashboardLayout><PageContainer><DetailSkeleton /></PageContainer></DashboardLayout>;
  if (errors.book) return <DashboardLayout><PageContainer><div className="rounded-xl border border-red-100 bg-white p-8 text-center"><p className="text-gray-600">{errors.book}</p><button type="button" onClick={loadBook} className="mt-4 text-sm font-semibold text-amber-700">Try again</button><Link to="/books" className="ml-4 text-sm font-semibold text-amber-700">Back to books</Link></div></PageContainer></DashboardLayout>;

  const available = book.availableCopies > 0 && book.status === "available";
  const details = [["ISBN", book.isbn], ["Publisher", book.publisher || "Not listed"], ["Language", book.language || "Not listed"], ["Published year", book.publishedYear || "Not listed"], ["Category", book.category]];

  const copyLabel = `${book.availableCopies} ${book.availableCopies === 1 ? "copy" : "copies"}${available ? " available" : " available · currently unavailable"}`;

  return <DashboardLayout><PageContainer>
    <Link to="/books" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"><ArrowLeft size={17} />Back to books</Link>
    <article className="mt-6 grid gap-8 rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm sm:p-8 md:grid-cols-[240px_1fr]"><BookCover book={book} /><div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{book.category}</span><h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1F2937]">{book.title}</h1><p className="mt-2 text-lg text-gray-500">{book.author}</p><div className="mt-5 flex items-center gap-3">{averageRating ? <><RatingStars value={averageRating} /><span className="text-sm font-semibold text-[#1F2937]">{averageRating.toFixed(1)}</span><span className="text-sm text-gray-500">({reviews.length} review{reviews.length === 1 ? "" : "s"})</span></> : <span className="text-sm text-gray-500">Not rated yet</span>}</div><p className="mt-6 leading-7 text-gray-600">{book.description || "No description is available for this book."}</p><div className="mt-7 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={label} className="rounded-lg bg-[#FFFDF7] p-3"><p className="text-gray-500">{label}</p><p className="mt-1 break-words font-semibold text-[#1F2937]">{value}</p></div>)}<div className="rounded-lg bg-[#FFFDF7] p-3"><p className="text-gray-500">Available copies</p><p className={`mt-1 font-semibold ${available ? "text-emerald-700" : "text-red-700"}`}>{copyLabel}</p></div></div><div className="mt-7 flex flex-wrap gap-3"><button type="button" disabled title="Books are issued by library staff." className="inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] opacity-60"><LibraryBig size={17} />Borrow</button><button type="button" onClick={saveToWishlist} className="inline-flex items-center gap-2 rounded-lg border border-[#F3E8C8] px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"><Heart size={17} />Wishlist</button></div></div></article>

    <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFCC33] text-[#1F2937]"><Sparkles size={19} /></span><div><h2 className="font-semibold text-[#1F2937]">AI Summary</h2><p className="mt-1 text-sm leading-6 text-gray-600">AI summaries will be available here soon. Check back for a concise overview of this book.</p></div></div></section>

    <section className="mt-10"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold text-[#1F2937]">Reviews</h2><p className="mt-1 text-sm text-gray-500">Feedback from BookHive readers.</p></div>{averageRating && <div className="hidden items-center gap-2 sm:flex"><RatingStars value={averageRating} /><span className="text-sm font-semibold text-gray-700">{averageRating.toFixed(1)} average</span></div>}</div>{errors.reviews ? <div className="mt-4 rounded-xl border border-red-100 bg-white p-5 text-sm text-gray-600">{errors.reviews}</div> : reviews.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-[#F3E8C8] bg-white p-8 text-center"><Star className="mx-auto text-amber-600" size={24} /><p className="mt-3 text-sm text-gray-500">No reviews yet.</p></div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{reviews.map((review) => <article key={review._id} className="rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#1F2937]">{review.student?.name || "BookHive reader"}</p><RatingStars value={review.rating} size={14} /></div>{review.comment && <p className="mt-3 text-sm leading-6 text-gray-600">{review.comment}</p>}<p className="mt-3 text-xs text-gray-400">{formatDate(review.createdAt)}</p></article>)}</div>}</section>

    <section className="mt-10"><h2 className="text-xl font-semibold text-[#1F2937]">Related Books</h2><p className="mt-1 text-sm text-gray-500">More titles in {book.category}.</p>{errors.related ? <div className="mt-4 rounded-xl border border-red-100 bg-white p-5 text-sm text-gray-600">{errors.related}</div> : relatedBooks.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-[#F3E8C8] bg-white p-8 text-center"><BookOpen className="mx-auto text-amber-600" size={24} /><p className="mt-3 text-sm text-gray-500">No related books are available right now.</p></div> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{relatedBooks.map((relatedBook) => <Link key={relatedBook._id} to={`/books/${relatedBook._id}`} className="rounded-xl border border-[#F3E8C8] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><BookCover book={relatedBook} /><h3 className="mt-3 truncate text-sm font-semibold text-[#1F2937]">{relatedBook.title}</h3><p className="mt-1 truncate text-xs text-gray-500">{relatedBook.author}</p></Link>)}</div>}</section>
  </PageContainer></DashboardLayout>;
}

export default BookDetails;
