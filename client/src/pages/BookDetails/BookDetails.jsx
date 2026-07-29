import { useEffect, useState } from "react";
import { ArrowLeft, Heart, LibraryBig } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import BookCover from "../../components/dashboard/BookCover";
import { addToWishlist, getBookById } from "../../services/booksService";

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBookById(id).then((data) => setBook(data.book)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load this book."));
  }, [id]);

  const saveToWishlist = async () => {
    try { await addToWishlist(book._id); toast.success("Book added to your wishlist."); } catch (requestError) { toast.error(requestError.response?.data?.message || "Unable to update your wishlist."); }
  };

  if (error) return <DashboardLayout><PageContainer><div className="rounded-xl border border-red-100 bg-white p-8 text-center"><p className="text-gray-600">{error}</p><Link to="/books" className="mt-4 inline-flex text-sm font-semibold text-amber-700">Back to books</Link></div></PageContainer></DashboardLayout>;
  if (!book) return <DashboardLayout><PageContainer><div className="grid animate-pulse gap-8 rounded-xl border border-[#F3E8C8] bg-white p-6 md:grid-cols-[220px_1fr]"><div className="aspect-[3/4] rounded-lg bg-amber-100" /><div><div className="h-8 w-2/3 rounded bg-gray-100" /><div className="mt-4 h-4 w-1/3 rounded bg-gray-100" /><div className="mt-8 h-24 rounded bg-gray-100" /></div></div></PageContainer></DashboardLayout>;

  const available = book.availableCopies > 0 && book.status === "available";
  return <DashboardLayout><PageContainer><Link to="/books" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"><ArrowLeft size={17} />Back to books</Link><article className="mt-6 grid gap-8 rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm sm:p-8 md:grid-cols-[220px_1fr]"><BookCover book={book} /><div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{book.category}</span><h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1F2937]">{book.title}</h1><p className="mt-2 text-lg text-gray-500">{book.author}</p><p className="mt-6 leading-7 text-gray-600">{book.description || "No description is available for this book."}</p><div className="mt-7 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg bg-[#FFFDF7] p-3"><p className="text-gray-500">Availability</p><p className={`mt-1 font-semibold ${available ? "text-emerald-700" : "text-red-700"}`}>{available ? `${book.availableCopies} available` : "Unavailable"}</p></div><div className="rounded-lg bg-[#FFFDF7] p-3"><p className="text-gray-500">Published</p><p className="mt-1 font-semibold text-[#1F2937]">{book.publishedYear || "Not listed"}</p></div><div className="rounded-lg bg-[#FFFDF7] p-3"><p className="text-gray-500">Language</p><p className="mt-1 font-semibold text-[#1F2937]">{book.language || "Not listed"}</p></div></div><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={saveToWishlist} className="inline-flex items-center gap-2 rounded-lg border border-[#F3E8C8] px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"><Heart size={17} />Wishlist</button><button type="button" disabled title="Books are issued by library staff." className="inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] opacity-60"><LibraryBig size={17} />Borrow</button></div></div></article></PageContainer></DashboardLayout>;
}

export default BookDetails;
