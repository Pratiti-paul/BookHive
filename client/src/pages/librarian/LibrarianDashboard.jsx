import { Link } from "react-router-dom";
import {
  Armchair,
  BookOpen,
  LibraryBig,
  ChevronRight,
  Building2,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import useAuth from "../../hooks/useAuth";

function LibrarianDashboard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(" ")[0] : "Librarian";

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Welcome Banner */}
        <section className="flex flex-col gap-4 border-b border-[#F3E8C8] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Building2 size={13} />
                Librarian Portal
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-base text-gray-600">
              Manage your assigned library's collection, student borrowings, and study seat layout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/librarian/seating"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F59E0B]"
            >
              <Armchair size={17} />
              Seating Layout
            </Link>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-amber-50"
            >
              <BookOpen size={17} />
              Manage Books
            </Link>
          </div>
        </section>

        {/* Feature Management Cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Seating Layout Card */}
          <article className="flex flex-col justify-between rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#EACD7D] hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Armchair size={24} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-[#1F2937]">Seating Arrangement</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Configure your library's seating floor plan, define row and column layouts, customize
                seat types, and activate/deactivate seats.
              </p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <Link
                to="/librarian/seating"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800"
              >
                Manage Seating Grid <ChevronRight size={16} />
              </Link>
            </div>
          </article>

          {/* Book Catalog Card */}
          <article className="flex flex-col justify-between rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#EACD7D] hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                <BookOpen size={24} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-[#1F2937]">Library Books</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Browse catalog inventory, update copies and book metadata, and oversee books stocked
                in your assigned branch.
              </p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <Link
                to="/books"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-800"
              >
                View Catalog <ChevronRight size={16} />
              </Link>
            </div>
          </article>

          {/* Borrow Requests Card */}
          <article className="flex flex-col justify-between rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#EACD7D] hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <LibraryBig size={24} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-[#1F2937]">Borrow Requests</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Review student borrow and loan renewal requests, check book availability, and
                process approvals or rejections safely.
              </p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <Link
                to="/borrow-requests"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 hover:text-purple-800"
              >
                Review Requests <ChevronRight size={16} />
              </Link>
            </div>
          </article>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}

export default LibrarianDashboard;
