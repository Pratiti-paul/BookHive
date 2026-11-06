import { useCallback, useEffect, useState } from "react";
import { BookOpen, Calendar, ExternalLink, Mail, MessageSquare, Star, Trash2, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import useAuth from "../../hooks/useAuth";
import { deleteReview, getMyReviews } from "../../services/reviewService";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "";

function RatingStars({ value, size = 15 }) {
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

function ProfileSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-xl border border-[#F3E8C8] bg-white p-6">
        <div className="h-6 w-1/4 rounded bg-amber-100" />
        <div className="mt-4 h-4 w-1/3 rounded bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

function Profile() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getMyReviews();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your reviews.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      toast.success("Review deleted successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const roleBadgeStyle =
    user?.role === "admin"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : user?.role === "librarian"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-amber-50 text-amber-800 border-[#F3E8C8]";

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Header / Account Card */}
        <section className="rounded-xl border border-[#F3E8C8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-800 shadow-inner">
                {user?.name ? user.name[0].toUpperCase() : <User size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">
                    {user?.name || "BookHive User"}
                  </h1>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle}`}
                  >
                    {user?.role || "Member"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={15} className="text-amber-700" />
                    {user?.email || "No email available"}
                  </span>
                  {user?.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={15} className="text-amber-700" />
                      Member since {formatDate(user.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/books"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F3E8C8] bg-[#FFFDF7] px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
              >
                <BookOpen size={15} />
                Browse Catalogue
              </Link>
            </div>
          </div>
        </section>

        {/* My Reviews Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between border-b border-[#F3E8C8] pb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2937]">My Reviews</h2>
              <p className="mt-1 text-sm text-gray-500">
                Books you have evaluated and shared feedback on.
              </p>
            </div>
            {!isLoading && (
              <span className="text-xs font-semibold text-gray-500">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"} submitted
              </span>
            )}
          </div>

          <div className="mt-6">
            {isLoading ? (
              <ProfileSkeleton />
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-white p-6 text-center text-sm text-gray-600">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={loadReviews}
                  className="mt-3 text-xs font-semibold text-amber-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white p-12 text-center">
                <MessageSquare className="mx-auto text-amber-600" size={30} />
                <h3 className="mt-3 font-semibold text-[#1F2937]">No reviews yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't submitted any book reviews yet. Borrow and read books to share your
                  thoughts with other readers!
                </p>
                <Link
                  to="/books"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2 text-xs font-semibold text-[#1F2937] transition hover:bg-[#F59E0B]"
                >
                  <BookOpen size={15} />
                  Explore Books
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((review) => {
                  const book = review.book;
                  const bookId = book?._id || book;
                  return (
                    <article
                      key={review._id}
                      className="flex flex-col justify-between rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="flex gap-4">
                          <div className="w-14 shrink-0">
                            <BookCover book={book} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/books/${bookId}`}
                              className="group inline-flex items-center gap-1 font-semibold text-[#1F2937] hover:text-amber-800"
                            >
                              <span className="truncate">{book?.title || "Book unavailable"}</span>
                              <ExternalLink
                                size={13}
                                className="opacity-0 transition group-hover:opacity-100"
                              />
                            </Link>
                            <p className="truncate text-xs text-gray-500">
                              {book?.author || "Unknown author"}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <RatingStars value={review.rating} size={14} />
                              <span className="text-xs font-semibold text-gray-700">
                                {review.rating} / 5
                              </span>
                            </div>
                          </div>
                        </div>

                        {review.comment && (
                          <p className="mt-4 rounded-lg bg-[#FFFDF7] p-3 text-xs leading-5 text-gray-700">
                            "{review.comment}"
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                        <span>Reviewed {formatDate(review.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/books/${bookId}`}
                            className="font-semibold text-amber-700 hover:text-amber-800"
                          >
                            View Book
                          </Link>
                          <span className="text-gray-200">·</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(review._id)}
                            disabled={deletingId === review._id}
                            className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </PageContainer>
    </DashboardLayout>
  );
}

export default Profile;

