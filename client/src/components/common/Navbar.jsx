import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import logoIcon from "../../assets/logo-icon.svg";

const getInitials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BH";

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const menuRef = useRef(null);
  const displayName = user?.name || user?.email || "BookHive member";
  const role = user?.role || "member";

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 h-20 shrink-0 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden" aria-label="Open navigation">
          <Menu size={22} />
        </button>
        <Link to="/" className="flex min-w-fit items-center gap-2.5" aria-label="BookHive home">
          <img src={logoIcon} alt="" className="h-9 w-9" />
          <span className="hidden leading-tight sm:block"><span className="block text-lg font-bold tracking-tight text-gray-900">BookHive</span><span className="block text-[10px] font-medium uppercase tracking-wider text-amber-600">AI Powered Library</span></span>
        </Link>

        <label className="mx-auto hidden max-w-xl flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-400 transition focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100 md:flex">
          <Search size={18} />
          <input className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400" placeholder="Search books, authors or ISBN..." type="search" />
        </label>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button type="button" className="rounded-lg p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900" aria-label="Notifications"><Bell size={20} /></button>
          <button type="button" onClick={() => setIsDark((value) => !value)} className="rounded-lg p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900" aria-label="Toggle dark mode" aria-pressed={isDark}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setIsDropdownOpen((value) => !value)} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-gray-100" aria-expanded={isDropdownOpen} aria-haspopup="menu">
              {user?.profileImage ? <img src={user.profileImage} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">{getInitials(user?.name)}</span>}
              <span className="hidden max-w-32 text-left md:block"><span className="block truncate text-sm font-semibold text-gray-800">{displayName}</span><span className="block capitalize text-xs text-gray-500">{role}</span></span>
              <ChevronDown size={16} className="hidden text-gray-500 md:block" />
            </button>
            {isDropdownOpen && <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg" role="menu">
              <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50" role="menuitem"><User size={16} /> Profile</Link>
              <Link to="/settings" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50" role="menuitem"><Settings size={16} /> Settings</Link>
              <div className="my-1 border-t border-gray-100" />
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50" role="menuitem"><LogOut size={16} /> Logout</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
