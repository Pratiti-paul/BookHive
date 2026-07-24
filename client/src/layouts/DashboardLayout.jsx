import { useState } from "react";
import Footer from "../components/common/Footer";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return <div className="flex min-h-screen flex-col bg-slate-50 text-gray-900"><Navbar onMenuClick={() => setIsSidebarOpen(true)} /><div className="flex min-h-0 flex-1"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /><main className="min-w-0 flex-1 overflow-y-auto">{children}</main></div><Footer /></div>;
}

export default DashboardLayout;
