import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BookOpen, Bot, CalendarDays, ChevronRight, Clock3, Heart, MapPin, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import BookCover from "../../components/dashboard/BookCover";
import { EmptyState, ErrorState, SectionSkeleton } from "../../components/dashboard/DashboardState";
import StatCard from "../../components/dashboard/StatCard";
import PageContainer from "../../components/common/PageContainer";
import useAuth from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getStudentDashboardData } from "../../services/dashboardService";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "No due date";
const daysUntil = (value) => Math.ceil((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
const dueLabel = (value) => {
  const days = daysUntil(value);
  if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, tone: "bg-red-50 text-red-700" };
  if (days === 0) return { text: "Due today", tone: "bg-red-50 text-red-700" };
  if (days === 1) return { text: "Due tomorrow", tone: "bg-amber-50 text-amber-700" };
  return { text: `Due ${formatDate(value)}`, tone: "bg-emerald-50 text-emerald-700" };
};

function SectionHeading({ title, action }) {
  return <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-[#1F2937]">{title}</h2>{action}</div>;
}

function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    const result = await getStudentDashboardData();
    setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const derived = useMemo(() => {
    const borrows = data?.borrows || [];
    const activeBorrows = borrows.filter((borrow) => borrow.status === "borrowed" || borrow.status === "overdue");
    const activeBookings = (data?.bookings || []).filter((booking) => booking.status === "Booked" && new Date(booking.date) >= new Date(new Date().setHours(0, 0, 0, 0)));
    return {
      activeBorrows,
      upcoming: [...activeBorrows].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4),
      recentBorrows: borrows.slice(0, 4),
      activeBookings,
    };
  }, [data]);

  const firstName = user?.name?.split(" ")[0] || "Reader";
  const sectionError = (key) => data?.errors?.[key];
  const hasDashboardIssue = data && Object.values(data.errors).some(Boolean);
  const stats = [
    { label: "Borrowed Books", value: derived.activeBorrows.length, detail: "Currently checked out", icon: BookOpen },
    { label: "Wishlist", value: data?.wishlist.length || 0, detail: "Books saved for later", icon: Heart },
    { label: "Notifications", value: data?.unreadCount || 0, detail: "Unread updates", icon: Bell },
    { label: "Active Seat Booking", value: derived.activeBookings.length, detail: "Upcoming reservations", icon: CalendarDays },
  ];

  return <DashboardLayout><PageContainer>
    <section className="flex flex-col gap-5 border-b border-[#F3E8C8] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-amber-700">Student dashboard</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">Welcome back, {firstName}</h1><p className="mt-2 text-base text-gray-500">Here’s what is happening with your library today.</p></div><div className="flex flex-wrap gap-3"><Link to="/books" className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F59E0B]"><Search size={17} />Browse Books</Link><Link to="/seat-booking" className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-amber-50"><CalendarDays size={17} />Reserve Seat</Link><Link to="/assistant" className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-amber-50"><Bot size={17} />AI Search</Link></div></section>

    {hasDashboardIssue && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Some dashboard information could not be loaded. You can retry individual sections below.</div>}

    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{isLoading ? <SectionSkeleton count={4} className="sm:col-span-2 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-4" /> : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>

    <section className="mt-10 grid gap-8 xl:grid-cols-[1.45fr_.85fr]">
      <div><SectionHeading title="Recently Borrowed" action={<Link to="/my-books" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800">View all <ChevronRight size={16} /></Link>} />
        {isLoading ? <SectionSkeleton count={3} className="sm:grid-cols-2 lg:grid-cols-3" /> : sectionError("borrowed") ? <ErrorState message={sectionError("borrowed")} onRetry={loadDashboard} /> : derived.recentBorrows.length === 0 ? <EmptyState message="You have not borrowed any books yet." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{derived.recentBorrows.slice(0, 3).map((borrow) => { const due = dueLabel(borrow.dueDate); return <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key={borrow._id} className="rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm transition hover:shadow-md"><div className="flex gap-3"><div className="w-16 shrink-0"><BookCover book={borrow.book} /></div><div className="min-w-0"><h3 className="truncate font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</h3><p className="mt-1 truncate text-sm text-gray-500">{borrow.book?.author || "Unknown author"}</p><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${due.tone}`}>{due.text}</span></div></div><p className="mt-4 text-xs text-gray-500">{borrow.library?.name || "Library information unavailable"}</p></motion.article>; })}</div>}</div>
      <div><SectionHeading title="Upcoming Due Dates" />
        {isLoading ? <SectionSkeleton count={3} /> : sectionError("borrowed") ? <ErrorState message={sectionError("borrowed")} onRetry={loadDashboard} /> : derived.upcoming.length === 0 ? <EmptyState message="No upcoming return dates." /> : <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white">{derived.upcoming.map((borrow) => { const due = dueLabel(borrow.dueDate); return <div key={borrow._id} className="flex items-center gap-3 border-b border-[#F3E8C8] px-4 py-3.5 last:border-0"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock3 size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#1F2937]">{borrow.book?.title || "Book unavailable"}</p><p className="mt-0.5 text-xs text-gray-500">{formatDate(borrow.dueDate)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${due.tone}`}>{due.text}</span></div>; })}</div>}</div>
    </section>

    <section className="mt-10"><SectionHeading title="Recommended Books" action={<Link to="/books" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800">Browse all <ChevronRight size={16} /></Link>} />
      {isLoading ? <SectionSkeleton count={4} className="sm:grid-cols-2 lg:grid-cols-4" /> : sectionError("books") ? <ErrorState message={sectionError("books")} onRetry={loadDashboard} /> : data.books.length === 0 ? <EmptyState message="No recommended books are available right now." /> : <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">{data.books.slice(0, 6).map((book) => <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={book._id} className="w-48 shrink-0 snap-start rounded-xl border border-[#F3E8C8] bg-white p-3 shadow-sm transition hover:shadow-md"><BookCover book={book} /><div className="mt-3"><h3 className="truncate text-sm font-semibold text-[#1F2937]">{book.title}</h3><p className="mt-1 truncate text-xs text-gray-500">{book.author}</p><div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">{book.category || "General"}</span><span className="text-xs text-gray-500">{book.availableCopies ?? 0} available</span></div></div></motion.article>)}</div>}</section>

    <section className="mt-10 grid gap-8 xl:grid-cols-[.95fr_1.05fr]">
      <div><SectionHeading title="Active Seat Booking" action={<Link to="/seat-booking" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800">Manage <ChevronRight size={16} /></Link>} />
        {isLoading ? <SectionSkeleton count={1} /> : sectionError("bookings") ? <ErrorState message={sectionError("bookings")} onRetry={loadDashboard} /> : derived.activeBookings.length === 0 ? <EmptyState message="No active seat booking. Reserve a space for your next study session." /> : <div className="rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm">{derived.activeBookings.slice(0, 1).map((booking) => <div key={booking._id}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-gray-500">Reserved at</p><h3 className="mt-1 text-lg font-semibold text-[#1F2937]">{booking.library?.name || "Library"}</h3></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><MapPin size={20} /></span></div><div className="mt-5 flex items-center gap-2 text-sm text-gray-600"><CalendarDays size={16} className="text-amber-700" />{formatDate(booking.date)} · {booking.startTime} – {booking.endTime}</div></div>)}</div>}</div>
      <div><SectionHeading title="Recent Notifications" action={<Link to="/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800">View all <ChevronRight size={16} /></Link>} />
        {isLoading ? <SectionSkeleton count={3} /> : sectionError("notifications") ? <ErrorState message={sectionError("notifications")} onRetry={loadDashboard} /> : data.notifications.length === 0 ? <EmptyState message="You are all caught up—no notifications yet." /> : <div className="overflow-hidden rounded-xl border border-[#F3E8C8] bg-white">{data.notifications.slice(0, 4).map((notification) => <div key={notification._id} className="flex gap-3 border-b border-[#F3E8C8] px-4 py-4 last:border-0"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-gray-300" : "bg-[#F4B400]"}`} /><div className="min-w-0"><p className="text-sm font-semibold text-[#1F2937]">{notification.title}</p><p className="mt-1 text-sm leading-5 text-gray-500">{notification.message}</p><p className="mt-1.5 text-xs text-gray-400">{formatDate(notification.createdAt)}</p></div></div>)}</div>}</div>
    </section>

    <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFCC33] text-[#1F2937]"><Sparkles size={19} /></span><div><h2 className="font-semibold text-[#1F2937]">Need help finding a book?</h2><p className="mt-1 text-sm text-gray-600">Use AI Search to explore titles, topics and authors across your libraries.</p></div></div><Link to="/assistant" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F59E0B] sm:mt-0"><Bot size={16} />Open AI Search</Link></section>
  </PageContainer></DashboardLayout>;
}

export default StudentDashboard;
