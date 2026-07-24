import {
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  LibraryBig,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import useAuth from "../../hooks/useAuth";

const stats = [
  { label: "Available Books", value: "12,480", detail: "Across your libraries", icon: LibraryBig },
  { label: "Borrowed Books", value: "3", detail: "1 due this week", icon: BookOpen },
  { label: "Wishlist", value: "18", detail: "4 new matches", icon: Heart },
  { label: "Due Soon", value: "1", detail: "Due tomorrow", icon: Clock3 },
];

const borrowedBooks = [
  { title: "Atomic Habits", author: "James Clear", due: "Due Jul 29", status: "On Time", cover: "bg-amber-100 text-amber-800", badge: "bg-emerald-50 text-emerald-700" },
  { title: "Deep Work", author: "Cal Newport", due: "Due Tomorrow", status: "Due Tomorrow", cover: "bg-slate-800 text-white", badge: "bg-amber-50 text-amber-700" },
  { title: "Clean Code", author: "Robert C. Martin", due: "Due Jul 22", status: "Overdue", cover: "bg-gray-200 text-gray-800", badge: "bg-red-50 text-red-700" },
];

const readingBooks = [
  { title: "The Psychology of Money", author: "Morgan Housel", progress: "68%", progressWidth: "w-[68%]", cover: "bg-yellow-100 text-yellow-800" },
  { title: "Design Patterns", author: "Erich Gamma et al.", progress: "42%", progressWidth: "w-[42%]", cover: "bg-gray-800 text-white" },
  { title: "The Almanack of Naval Ravikant", author: "Eric Jorgenson", progress: "25%", progressWidth: "w-1/4", cover: "bg-orange-100 text-orange-800" },
];

const recommendations = [
  { title: "The Creative Act", author: "Rick Rubin", category: "Creativity", rating: "4.8", cover: "bg-stone-800 text-white" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology", rating: "4.7", cover: "bg-amber-100 text-amber-900" },
  { title: "The Pragmatic Programmer", author: "David Thomas", category: "Technology", rating: "4.9", cover: "bg-slate-700 text-white" },
  { title: "Essentialism", author: "Greg McKeown", category: "Productivity", rating: "4.6", cover: "bg-gray-200 text-gray-800" },
];

function BookCover({ title, className }) {
  return <div className={`flex aspect-[3/4] w-full flex-col justify-end rounded-lg p-3 shadow-sm ${className}`}><BookOpen size={18} strokeWidth={1.75} /><span className="mt-2 line-clamp-2 text-sm font-bold leading-tight">{title}</span></div>;
}

function SectionHeading({ title, description, action }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-gray-900">{title}</h2>{description && <p className="mt-1 text-sm text-gray-500">{description}</p>}</div>{action}</div>;
}

function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Reader";

  return <DashboardLayout><PageContainer>
    <section className="flex flex-col gap-5 border-b border-gray-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-amber-700">Your library, organized</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Good Morning, {firstName} <span aria-hidden="true">👋</span></h1><p className="mt-2 text-base text-gray-500">Ready to discover your next great read?</p></div>
      <div className="flex shrink-0 flex-wrap gap-3"><Link to="/books" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 hover:shadow"><BookOpen size={17} />Browse Books</Link><Link to="/assistant" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"><Bot size={17} />Ask AI</Link></div>
    </section>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Icon size={20} /></span></div><p className="mt-3 text-xs text-gray-500">{detail}</p></article>)}
    </section>

    <section className="mt-10">
      <SectionHeading title="Currently Borrowed" description="Keep track of books currently with you." action={<Link to="/my-books" className="hidden items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 sm:inline-flex">View all <ChevronRight size={16} /></Link>} />
      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
        {borrowedBooks.map((book) => <article key={book.title} className="w-64 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"><div className="flex gap-3"><div className="w-16 shrink-0"><BookCover title={book.title} className={book.cover} /></div><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{book.title}</h3><p className="mt-1 truncate text-sm text-gray-500">{book.author}</p><p className="mt-3 text-xs text-gray-500">{book.due}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${book.badge}`}>{book.status}</span></div></div><button type="button" className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">View Details</button></article>)}
      </div>
    </section>

    <section className="mt-10">
      <SectionHeading title="Continue Reading" description="Pick up right where you left off." />
      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
        {readingBooks.map((book) => <article key={book.title} className="w-56 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"><BookCover title={book.title} className={book.cover} /><div className="mt-4 flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-gray-900">{book.title}</h3><p className="mt-1 truncate text-xs text-gray-500">{book.author}</p></div><span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">AI Summary</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full bg-amber-500 ${book.progressWidth}`} /></div><div className="mt-2 flex items-center justify-between text-xs text-gray-500"><span>{book.progress} complete</span><button type="button" className="font-semibold text-amber-700 hover:text-amber-800">Continue Reading</button></div></article>)}
      </div>
    </section>

    <section className="mt-10">
      <SectionHeading title="Recommended For You" description="A few thoughtful picks based on your reading." action={<Link to="/books" className="hidden items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 sm:inline-flex">Browse collection <ChevronRight size={16} /></Link>} />
      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
        {recommendations.map((book) => <article key={book.title} className="w-48 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"><BookCover title={book.title} className={book.cover} /><div className="mt-3"><h3 className="truncate text-sm font-semibold text-gray-900">{book.title}</h3><p className="mt-1 truncate text-xs text-gray-500">{book.author}</p><div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">{book.category}</span><span className="flex items-center gap-1 text-xs font-semibold text-gray-700"><Star size={13} className="fill-amber-400 text-amber-400" />{book.rating}</span></div><button type="button" className="mt-3 w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white transition hover:bg-gray-800">Borrow</button></div></article>)}
      </div>
    </section>

    <section className="mt-10 grid gap-5 lg:grid-cols-3">
      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Today's Seat</p><h2 className="mt-1 text-lg font-semibold text-gray-900">Library reservation</h2></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><MapPin size={20} /></span></div><div className="mt-5 space-y-2 text-sm"><p className="font-medium text-gray-800">Central Library <span className="font-normal text-gray-500">· Seat A-14</span></p><p className="flex items-center gap-2 text-gray-500"><CalendarDays size={16} /> 10:00 AM – 1:00 PM</p></div><button type="button" className="mt-5 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">View Booking</button></article>
      <article className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-amber-800">AI Librarian</p><h2 className="mt-1 text-lg font-semibold text-gray-900">Your reading companion</h2></div><Sparkles className="text-amber-600" size={22} /></div><p className="mt-4 text-sm leading-6 text-gray-600">Ask about books, summarize chapters, find similar authors, and get your next recommendation.</p><Link to="/assistant" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"><Bot size={16} />Open AI Assistant</Link></article>
      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Reading Activity</p><h2 className="mt-1 text-lg font-semibold text-gray-900">Keep your momentum</h2></div><TrendingUp className="text-amber-600" size={21} /></div><div className="mt-5"><div className="flex items-baseline justify-between"><p className="text-sm text-gray-600">Books read this month</p><span className="text-lg font-bold text-gray-900">4</span></div><div className="mt-4 flex items-baseline justify-between"><p className="text-sm text-gray-600">Reading goal</p><span className="text-sm font-semibold text-gray-800">4 / 6 books</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-amber-500" /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><CheckCircle2 size={14} className="text-emerald-600" /> You're on track this month.</p></div></article>
    </section>
  </PageContainer></DashboardLayout>;
}

export default StudentDashboard;
