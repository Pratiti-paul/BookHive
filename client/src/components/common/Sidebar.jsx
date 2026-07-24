import { BookOpen, Bot, Building2, CalendarDays, ChartLine, ChevronLeft, Heart, LayoutDashboard, LibraryBig, Settings, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const navigation = {
  student: [
    ["Dashboard", "/student/dashboard", LayoutDashboard], ["Browse Books", "/books", BookOpen], ["My Books", "/my-books", LibraryBig], ["Seat Booking", "/seat-booking", CalendarDays], ["Wishlist", "/wishlist", Heart], ["AI Assistant", "/assistant", Bot], ["Profile", "/profile", Users],
  ],
  librarian: [
    ["Dashboard", "/librarian/dashboard", LayoutDashboard], ["Manage Books", "/books", BookOpen], ["Borrow Requests", "/borrow-requests", LibraryBig], ["Seat Booking", "/seat-booking", CalendarDays], ["Students", "/students", Users], ["Profile", "/profile", Users],
  ],
  admin: [
    ["Dashboard", "/admin/dashboard", LayoutDashboard], ["Libraries", "/libraries", Building2], ["Manage Books", "/books", BookOpen], ["Users", "/users", Users], ["Analytics", "/analytics", ChartLine], ["Settings", "/settings", Settings], ["Profile", "/profile", Users],
  ],
};

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const links = navigation[user?.role] || [];
  return <>
    <button type="button" className={`fixed inset-0 z-40 bg-gray-900/30 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} aria-label="Close navigation" />
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-gray-200 bg-white pt-20 transition-transform duration-300 lg:static lg:z-0 lg:translate-x-0 lg:pt-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 lg:hidden"><span className="text-sm font-semibold text-gray-900">Navigation</span><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close navigation"><ChevronLeft size={20} /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{user?.role || "Member"} portal</p>
        {links.map(([label, path, Icon]) => <NavLink key={label} to={path} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${isActive ? "bg-amber-50 text-amber-700 shadow-sm" : "text-gray-600 hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-900"}`}><Icon size={19} strokeWidth={1.9} />{label}</NavLink>)}
      </nav>
      <div className="m-4 rounded-xl bg-gray-50 p-4"><p className="text-sm font-semibold text-gray-800">Need help?</p><p className="mt-1 text-xs leading-relaxed text-gray-500">Find your next great read with BookHive.</p></div>
    </aside>
  </>;
}

export default Sidebar;
