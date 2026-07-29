import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  LibraryBig,
  Menu,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

const navLinks = ["Home", "Libraries", "Books", "Features", "About"];
const features = [
  [BrainCircuit, "AI Book Summary", "Get the key ideas from any book in seconds, before you start reading."],
  [CalendarDays, "Seat Booking", "Reserve a quiet study space at your favourite library with a few clicks."],
  [Sparkles, "Smart Recommendations", "Find books that match your interests and reading goals."],
  [BookMarked, "Borrow Management", "Keep every due date, renewal and borrowed title in one place."],
  [Bell, "Thoughtful Notifications", "Never miss a return date or a newly available book again."],
  [BarChart3, "Library Analytics", "Understand reading habits and library activity at a glance."],
];
const books = [
  ["Atomic Habits", "James Clear", "Self growth", "bg-amber-100 text-amber-900", "4.9"],
  ["Deep Work", "Cal Newport", "Productivity", "bg-violet-100 text-violet-900", "4.8"],
  ["The Psychology of Money", "Morgan Housel", "Finance", "bg-slate-800 text-white", "4.9"],
  ["Clean Code", "Robert C. Martin", "Technology", "bg-rose-100 text-rose-900", "4.7"],
];
const libraries = [
  ["Central Knowledge Hub", "24,000+ books · 340 seats", "Downtown", "bg-violet-100 text-violet-700"],
  ["Riverside Study Centre", "12,600+ books · 180 seats", "Riverside", "bg-amber-100 text-amber-700"],
  ["Innovation Library", "8,900+ books · 120 seats", "Tech Park", "bg-slate-100 text-slate-700"],
];
const testimonials = [
  ["BookHive makes finding and managing books feel effortless. The AI summaries are a game changer before classes.", "Ananya Sharma", "Computer Science Student", "AS"],
  ["Our students reserve seats, borrow books, and discover titles without queues. It is a much calmer library now.", "Rohan Mehta", "Librarian, Central Hub", "RM"],
  ["I love having my reading list, due dates and recommendations all in one focused place.", "Ishita Nair", "Design Student", "IN"],
];

const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

function Logo() {
  return <Link to="/" className="flex items-center gap-2.5" aria-label="BookHive home"><span className="h-10 w-10 overflow-hidden rounded-xl bg-white shadow-sm"><img src={logo} alt="" className="h-[86px] w-[86px] max-w-none -translate-x-[23px] -translate-y-[17px] object-contain" /></span><span className="text-xl font-bold tracking-tight text-slate-900">Book<span className="text-amber-500">Hive</span></span></Link>;
}

function BookArtwork({ title, tone }) {
  return <div className={`flex h-48 flex-col justify-between rounded-xl p-4 shadow-sm ${tone}`}><BookOpen size={22} strokeWidth={1.7} /><p className="max-w-28 text-xl font-bold leading-tight">{title}</p><div className="h-1 w-12 rounded-full bg-current opacity-40" /></div>;
}

function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
        <Logo />
        <div className="hidden items-center gap-7 lg:flex">{navLinks.map((link) => <a key={link} href={link === "Home" ? "#home" : `#${link.toLowerCase()}`} className="text-sm font-medium text-slate-600 transition hover:text-violet-700">{link}</a>)}</div>
        <div className="hidden items-center gap-3 sm:flex"><Link to="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Login</Link><Link to="/register" className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 hover:shadow">Register</Link></div>
        <button type="button" onClick={() => setIsMenuOpen((open) => !open)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Toggle navigation" aria-expanded={isMenuOpen}>{isMenuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </nav>
      {isMenuOpen && <div className="border-t border-slate-100 bg-white px-5 py-4 lg:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">{navLinks.map((link) => <a key={link} onClick={() => setIsMenuOpen(false)} href={link === "Home" ? "#home" : `#${link.toLowerCase()}`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{link}</a>)}<div className="mt-3 flex gap-3 border-t border-slate-100 pt-4"><Link to="/login" className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">Login</Link><Link to="/register" className="flex-1 rounded-lg bg-violet-700 px-4 py-2.5 text-center text-sm font-semibold text-white">Register</Link></div></div></div>}
    </header>

    <main id="home">
      <section className="relative py-16 sm:py-24 lg:py-28"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.04fr_.96fr] lg:gap-20"><motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}><motion.div variants={reveal} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700"><Sparkles size={15} />AI-powered library management</motion.div><motion.h1 variants={reveal} className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Discover, Borrow <span className="text-violet-700">&amp; Learn</span> Smarter</motion.h1><motion.p variants={reveal} className="mt-6 max-w-xl text-lg leading-8 text-slate-600">BookHive brings your libraries, books, study spaces and reading goals together in one beautifully simple place.</motion.p><motion.div variants={reveal} className="mt-8 flex flex-wrap gap-3"><a href="#books" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 hover:shadow"><Search size={18} />Explore Books</a><Link to="/register" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Get Started <ArrowRight size={17} /></Link></motion.div><motion.div variants={reveal} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><span className="flex items-center gap-2"><Check size={16} className="text-amber-500" />Free for students</span><span className="flex items-center gap-2"><Check size={16} className="text-amber-500" />Built for every library</span></motion.div></motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.15 }} className="relative mx-auto w-full max-w-lg"><div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-xl shadow-violet-100/40 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">Your next read</p><h2 className="mt-1 text-xl font-bold">The joy of discovery</h2></div><span className="rounded-xl bg-amber-100 p-3 text-amber-700"><Sparkles size={22} /></span></div><div className="mt-6 grid grid-cols-[.82fr_1.18fr] gap-5"><BookArtwork title="The Creative Act" tone="bg-amber-100 text-amber-900" /><div className="space-y-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">AI insight</p><p className="mt-2 text-sm leading-6 text-slate-600">A thoughtful exploration of creativity and making meaningful work.</p></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Heart size={17} /></span><div><p className="text-sm font-semibold">Made for you</p><p className="text-xs text-slate-500">98% match</p></div></div></div></div></div><div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex sm:items-center sm:gap-3"><span className="rounded-lg bg-violet-100 p-2 text-violet-700"><LibraryBig size={18} /></span><div><p className="text-xs text-slate-500">Books available</p><p className="text-sm font-bold">12,480 titles</p></div></div><div className="absolute -right-4 top-12 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:block"><div className="flex items-center gap-1 text-amber-500"><Star size={14} className="fill-current" /><Star size={14} className="fill-current" /><Star size={14} className="fill-current" /></div><p className="mt-1 text-xs font-medium text-slate-600">Loved by readers</p></div></motion.div></div></section>

      <section className="border-y border-slate-200 bg-white py-8"><div className="mx-auto max-w-4xl px-5 sm:px-8"><label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100"><Search className="text-violet-700" size={21} /><input type="search" placeholder="Search by title, author or ISBN" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:text-base" /><button type="button" className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800">Search</button></label></div></section>

      <section id="features" className="py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="max-w-2xl"><p className="text-sm font-semibold text-amber-600">Everything you need</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A better library experience, from every angle.</h2><p className="mt-4 leading-7 text-slate-600">Built for curious students, thoughtful librarians and thriving campuses.</p></div><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, detail]) => <motion.article variants={reveal} key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"><span className="inline-flex rounded-xl bg-violet-50 p-3 text-violet-700"><Icon size={22} /></span><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></motion.article>)}</motion.div></div></section>

      <section id="books" className="bg-white py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex items-end justify-between gap-5"><div><p className="text-sm font-semibold text-amber-600">Reader favourites</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Featured books</h2></div><a href="#books" className="hidden items-center gap-1 text-sm font-semibold text-violet-700 sm:inline-flex">View all books <ChevronRight size={17} /></a></div><div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{books.map(([title, author, category, tone, rating]) => <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><BookArtwork title={title} tone={tone} /><div className="mt-4"><p className="text-xs font-medium text-violet-700">{category}</p><h3 className="mt-1 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{author}</p><div className="mt-4 flex items-center justify-between"><span className="flex items-center gap-1 text-sm font-semibold"><Star size={15} className="fill-amber-400 text-amber-400" />{rating}</span><button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700">Borrow</button></div></div></article>)}</div></div></section>

      <section id="libraries" className="py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-end"><div><p className="text-sm font-semibold text-amber-600">Made for campuses</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Popular libraries near you.</h2><p className="mt-4 max-w-md leading-7 text-slate-600">Explore a connected network of spaces designed for focus, discovery and learning together.</p><a href="#libraries" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">Explore libraries <ArrowRight size={17} /></a></div><div className="grid gap-4">{libraries.map(([name, detail, location, tone]) => <article key={name} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Building2 size={22} /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div><span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">{location}</span></article>)}</div></div></div></section>

      <section className="border-y border-violet-100 bg-violet-50 py-12"><div className="mx-auto grid max-w-7xl gap-8 px-5 text-center sm:grid-cols-2 sm:px-8 lg:grid-cols-4">{[["50k+", "Books to discover", BookOpen], ["40+", "Connected libraries", Building2], ["12k+", "Active students", Users], ["85k+", "Successful borrowings", BookMarked]].map(([value, label, Icon]) => <div key={label}><Icon className="mx-auto text-amber-600" size={22} /><p className="mt-3 text-3xl font-bold text-violet-900">{value}</p><p className="mt-1 text-sm text-violet-800/70">{label}</p></div>)}</div></section>

      <section id="about" className="py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="text-center"><p className="text-sm font-semibold text-amber-600">Trusted by readers</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A favourite part of campus life.</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{testimonials.map(([quote, name, role, initials]) => <article key={name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex gap-1 text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} className="fill-current" />)}</div><p className="mt-5 leading-7 text-slate-600">“{quote}”</p><div className="mt-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{initials}</span><div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-slate-500">{role}</p></div></div></article>)}</div></div></section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24"><div className="mx-auto max-w-7xl rounded-3xl bg-violet-800 px-6 py-12 text-center text-white shadow-lg sm:px-12 sm:py-16"><Sparkles className="mx-auto text-amber-300" size={25} /><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Your next great read is waiting.</h2><p className="mx-auto mt-4 max-w-xl text-violet-100">Join BookHive to discover books, manage borrowing and make every study session count.</p><Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-300">Get started for free <ArrowRight size={17} /></Link></div></section>
    </main>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><Logo /><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Smarter discovery and simpler library management for every learner.</p></div><div><p className="text-sm font-semibold">Explore</p><div className="mt-3 grid gap-2 text-sm text-slate-500"><a href="#books">Books</a><a href="#libraries">Libraries</a><a href="#features">Features</a></div></div><div><p className="text-sm font-semibold">Platform</p><div className="mt-3 grid gap-2 text-sm text-slate-500"><Link to="/login">Login</Link><Link to="/register">Register</Link><a href="#about">About us</a></div></div><div><p className="text-sm font-semibold">Stay in the loop</p><p className="mt-3 text-sm leading-6 text-slate-500">Discover new titles and library updates.</p><button type="button" className="mt-3 text-sm font-semibold text-violet-700">Subscribe to updates</button></div></div><div className="border-t border-slate-100 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} BookHive. Built for curious minds.</div></footer>
  </div>;
}

export default Home;
