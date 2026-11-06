import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Edit3,
  Heart,
  LibraryBig,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import useAuth from "../../hooks/useAuth";
import {
  addToWishlist,
  createReview,
  deleteReview,
  getBookById,
  getBookReviews,
  getBooks,
  updateReview,
} from "../../services/booksService";
import { getMyBorrowedBooks, requestBorrow } from "../../services/borrowService";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "";

function RatingStars({ value, size = 17 }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(value)
              ? "fill-[#FFCC33] text-[#FFCC33]"
              : "text-gray-200"
          }
        />
      ))}
    </span>
  );
}

function StarRatingInput({ value, onChange, disabled = false }) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Select star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverValue || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="rounded p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={24}
              className={
                isFilled
                  ? "fill-[#FFCC33] text-[#FFCC33]"
                  : "text-gray-300 transition-colors hover:text-amber-300"
              }
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-semibold text-gray-700">
        {hoverValue || value} of 5 stars
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid animate-pulse gap-8 rounded-xl border border-[#F3E8C8] bg-white p-6 md:grid-cols-[220px_1fr]">
      <div className="aspect-[3/4] rounded-lg bg-amber-100" />
      <div>
        <div className="h-8 w-2/3 rounded bg-gray-100" />
        <div className="mt-4 h-4 w-1/3 rounded bg-gray-100" />
        <div className="mt-8 h-24 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function BookDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [borrowStatus, setBorrowStatus] = useState(null);
  const [hasBorrowedBook, setHasBorrowedBook] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const [errors, setErrors] = useState({ book: "", reviews: "", related: "" });
  const [isLoading, setIsLoading] = useState(true);

  const loadBook = useCallback(async () => {
    setIsLoading(true);
    setErrors({ book: "", reviews: "", related: "" });
    try {
      const bookData = await getBookById(id);
      setBook(bookData.book);

      const asyncCalls = [
        getBookReviews(id),
        getBooks({ category: bookData.book.category, limit: 8, sort: "-createdAt" }),
      ];

      if (user) {
        asyncCalls.push(getMyBorrowedBooks());
      }

      const results = await Promise.allSettled(asyncCalls);
      const reviewsResult = results[0];
      const relatedResult = results[1];
      const borrowResult = user ? results[2] : null;

      if (reviewsResult.status === "fulfilled") {
        setReviews(reviewsResult.value.reviews || []);
      } else {
        setErrors((current) => ({
          ...current,
          reviews: reviewsResult.reason.response?.data?.message || "Reviews could not be loaded.",
        }));
      }

      if (relatedResult.status === "fulfilled") {
        setRelatedBooks(
          (relatedResult.value.books || []).filter((item) => item._id !== id).slice(0, 4)
        );
      } else {
        setErrors((current) => ({
          ...current,
          related: relatedResult.reason.response?.data?.message || "Related books could not be loaded.",
        }));
      }

      if (borrowResult && borrowResult.status === "fulfilled") {
        const borrows = borrowResult.value.borrows || [];
        const activeBorrow = borrows.find(
          (b) => (b.book?._id || b.book) === id && (b.status === "pending" || b.status === "borrowed")
        );
        if (activeBorrow) {
          setBorrowStatus(activeBorrow.status);
        } else {
          setBorrowStatus(null);
        }

        const borrowedRecord = borrows.find(
          (b) =>
            (b.book?._id || b.book) === id &&
            b.status !== "pending" &&
            b.status !== "rejected"
        );
        setHasBorrowedBook(Boolean(borrowedRecord));
      }
    } catch (requestError) {
      setErrors((current) => ({
        ...current,
        book: requestError.response?.data?.message || "Unable to load this book.",
      }));
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  const saveToWishlist = async () => {
    try {
      await addToWishlist(book._id);
      toast.success("Book added to your wishlist.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update your wishlist.");
    }
  };

  const handleBorrow = async () => {
    if (!book) return;
    setIsBorrowing(true);
    try {
      await requestBorrow(book._id);
      setBorrowStatus("pending");
      toast.success("Borrow request submitted! Awaiting librarian approval.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to submit borrow request.");
    } finally {
      setIsBorrowing(false);
    }
  };

  // Find if user already submitted a review
  const myReview = useMemo(
    () => (user ? reviews.find((r) => (r.student?._id || r.student) === user._id) : null),
    [reviews, user]
  );

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const handleStartEdit = (review) => {
    setEditingReviewId(review._id);
    setReviewRating(review.rating);
    setReviewComment(review.comment || "");
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewComment("");
  };

  const handleReviewSubmit = async (e) => {
    e?.preventDefault();
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      if (editingReviewId) {
        const response = await updateReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment,
        });
        setReviews((prev) =>
          prev.map((r) => (r._id === editingReviewId ? response.review : r))
        );
        toast.success("Your review has been updated!");
        handleCancelEdit();
      } else {
        const response = await createReview({
          bookId: id,
          rating: reviewRating,
          comment: reviewComment,
        });
        setReviews((prev) => [response.review, ...prev]);
        toast.success("Thank you! Your review has been submitted.");
        setReviewRating(5);
        setReviewComment("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save your review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete your review?")) return;
    setDeletingReviewId(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      if (editingReviewId === reviewId) {
        handleCancelEdit();
      }
      toast.success("Review deleted successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  if (isLoading)
    return (
      <DashboardLayout>
        <PageContainer>
          <DetailSkeleton />
        </PageContainer>
      </DashboardLayout>
    );

  if (errors.book)
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
            <p className="text-gray-600">{errors.book}</p>
            <button
              type="button"
              onClick={loadBook}
              className="mt-4 text-sm font-semibold text-amber-700"
            >
              Try again
            </button>
            <Link to="/books" className="ml-4 text-sm font-semibold text-amber-700">
              Back to books
            </Link>
          </div>
        </PageContainer>
      </DashboardLayout>
    );

  const available = book.availableCopies > 0 && book.status === "available";
  const details = [
    ["ISBN", book.isbn],
    ["Publisher", book.publisher || "Not listed"],
    ["Language", book.language || "Not listed"],
    ["Published year", book.publishedYear || "Not listed"],
    ["Category", book.category],
  ];

  const copyLabel = `${book.availableCopies} ${
    book.availableCopies === 1 ? "copy" : "copies"
  }${available ? " available" : " available · currently unavailable"}`;

  return (
    <DashboardLayout>
      <PageContainer>
        <Link
          to="/books"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft size={17} />
          Back to books
        </Link>

        {/* Book Main Header */}
        <article className="mt-6 grid gap-8 rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm sm:p-8 md:grid-cols-[240px_1fr]">
          <BookCover book={book} />
          <div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {book.category}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1F2937]">{book.title}</h1>
            <p className="mt-2 text-lg text-gray-500">{book.author}</p>
            <div className="mt-5 flex items-center gap-3">
              {averageRating ? (
                <>
                  <RatingStars value={averageRating} />
                  <span className="text-sm font-semibold text-[#1F2937]">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Not rated yet</span>
              )}
            </div>
            <p className="mt-6 leading-7 text-gray-600">
              {book.description || "No description is available for this book."}
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {details.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#FFFDF7] p-3">
                  <p className="text-gray-500">{label}</p>
                  <p className="mt-1 break-words font-semibold text-[#1F2937]">{value}</p>
                </div>
              ))}
              <div className="rounded-lg bg-[#FFFDF7] p-3">
                <p className="text-gray-500">Available copies</p>
                <p
                  className={`mt-1 font-semibold ${
                    available ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {copyLabel}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 flex flex-wrap gap-3">
              {borrowStatus === "pending" ? (
                <span
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800"
                  title="Your borrow request is pending librarian approval."
                >
                  <Clock size={17} />
                  Requested
                </span>
              ) : borrowStatus === "borrowed" ? (
                <span
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800"
                  title="You currently have this book borrowed."
                >
                  <Check size={17} />
                  Borrowed
                </span>
              ) : !available ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400"
                >
                  <LibraryBig size={17} />
                  Unavailable
                </button>
              ) : user?.role === "student" ? (
                <button
                  type="button"
                  onClick={handleBorrow}
                  disabled={isBorrowing}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F59E0B] disabled:opacity-50"
                >
                  <LibraryBig size={17} />
                  {isBorrowing ? "Requesting…" : "Request to Borrow"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Only student accounts can request to borrow books."
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] opacity-60"
                >
                  <LibraryBig size={17} />
                  Borrow
                </button>
              )}
              <button
                type="button"
                onClick={saveToWishlist}
                className="inline-flex items-center gap-2 rounded-lg border border-[#F3E8C8] px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
              >
                <Heart size={17} />
                Wishlist
              </button>
            </div>
          </div>
        </article>

        {/* AI Summary Section */}
        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFCC33] text-[#1F2937]">
              <Sparkles size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-[#1F2937]">AI Summary</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                AI summaries will be available here soon. Check back for a concise overview of this book.
              </p>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between border-b border-[#F3E8C8] pb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2937]">Reviews & Ratings</h2>
              <p className="mt-1 text-sm text-gray-500">Feedback from BookHive readers.</p>
            </div>
            {averageRating && (
              <div className="flex items-center gap-2">
                <RatingStars value={averageRating} size={18} />
                <span className="text-sm font-bold text-gray-800">
                  {averageRating.toFixed(1)} / 5
                </span>
                <span className="text-xs text-gray-500">
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>

          {/* Review Interaction Block */}
          <div className="mt-6">
            {myReview && !editingReviewId ? (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1F2937]">You reviewed this book</p>
                  <div className="mt-1 flex items-center gap-2">
                    <RatingStars value={myReview.rating} size={14} />
                    <span className="text-xs font-semibold text-gray-600">
                      {myReview.rating} of 5 stars
                    </span>
                  </div>
                  {myReview.comment && (
                    <p className="mt-2 text-sm italic text-gray-600">"{myReview.comment}"</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(myReview)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#F3E8C8] bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                  >
                    <Edit3 size={13} />
                    Edit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(myReview._id)}
                    disabled={deletingReviewId === myReview._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ) : user?.role === "student" && (hasBorrowedBook || editingReviewId) ? (
              <form
                onSubmit={handleReviewSubmit}
                className="rounded-xl border border-[#F3E8C8] bg-[#FFFDF7] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1F2937]">
                    {editingReviewId ? "Edit Your Review" : "Write a Review"}
                  </h3>
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      <X size={14} />
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-600">
                    Your Rating
                  </label>
                  <div className="mt-1.5">
                    <StarRatingInput
                      value={reviewRating}
                      onChange={setReviewRating}
                      disabled={isSubmittingReview}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-600">
                    Review Comment (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    disabled={isSubmittingReview}
                    placeholder="Share your thoughts on the plot, characters, or key takeaways..."
                    className="mt-1.5 w-full rounded-lg border border-[#F3E8C8] bg-white p-3 text-sm text-[#1F2937] placeholder:text-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-gray-50"
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-[#F3E8C8] bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4B400] px-4 py-2 text-xs font-semibold text-[#1F2937] transition hover:bg-[#F59E0B] disabled:opacity-50"
                  >
                    <Send size={13} />
                    {isSubmittingReview
                      ? "Submitting…"
                      : editingReviewId
                      ? "Update Review"
                      : "Submit Review"}
                  </button>
                </div>
              </form>
            ) : user?.role === "student" && !hasBorrowedBook ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#F3E8C8] bg-[#FFFDF7] p-4 text-sm text-gray-600">
                <BookOpen size={17} className="shrink-0 text-amber-700" />
                <span>
                  Reviews are available to students who have borrowed this book from the library.
                </span>
              </div>
            ) : !user ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#F3E8C8] bg-[#FFFDF7] p-4 text-sm text-gray-600">
                <MessageSquare size={17} className="shrink-0 text-amber-700" />
                <span>
                  <Link to="/login" className="font-semibold text-amber-700 underline">
                    Sign in
                  </Link>{" "}
                  as a student to rate and review this book.
                </span>
              </div>
            ) : null}
          </div>

          {/* Reviews List */}
          <div className="mt-6">
            {errors.reviews ? (
              <div className="rounded-xl border border-red-100 bg-white p-5 text-sm text-gray-600">
                {errors.reviews}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white p-8 text-center">
                <Star className="mx-auto text-amber-600" size={26} />
                <p className="mt-3 text-sm font-semibold text-[#1F2937]">No reviews yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Be the first reader to share your thoughts on this title!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {reviews.map((review) => {
                  const isOwner = user && (review.student?._id || review.student) === user._id;
                  return (
                    <article
                      key={review._id}
                      className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition ${
                        isOwner ? "border-amber-300 ring-1 ring-amber-100" : "border-[#F3E8C8]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#1F2937]">
                              {review.student?.name || "BookHive reader"}
                            </p>
                            {isOwner && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                You
                              </span>
                            )}
                          </div>
                          <RatingStars value={review.rating} size={14} />
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm leading-6 text-gray-600">{review.comment}</p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-400">
                        <span>{formatDate(review.createdAt)}</span>
                        {isOwner && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(review)}
                              className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800"
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(review._id)}
                              disabled={deletingReviewId === review._id}
                              className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Related Books Section */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-[#1F2937]">Related Books</h2>
          <p className="mt-1 text-sm text-gray-500">More titles in {book.category}.</p>
          {errors.related ? (
            <div className="mt-4 rounded-xl border border-red-100 bg-white p-5 text-sm text-gray-600">
              {errors.related}
            </div>
          ) : relatedBooks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#F3E8C8] bg-white p-8 text-center">
              <BookOpen className="mx-auto text-amber-600" size={24} />
              <p className="mt-3 text-sm text-gray-500">No related books are available right now.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedBooks.map((relatedBook) => (
                <Link
                  key={relatedBook._id}
                  to={`/books/${relatedBook._id}`}
                  className="rounded-xl border border-[#F3E8C8] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <BookCover book={relatedBook} />
                  <h3 className="mt-3 truncate text-sm font-semibold text-[#1F2937]">
                    {relatedBook.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-gray-500">{relatedBook.author}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </DashboardLayout>
  );
}

export default BookDetails;
