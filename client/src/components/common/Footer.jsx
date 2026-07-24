import { GitBranch, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import logoIcon from "../../assets/logo-icon.svg";

function Footer() {
  return <footer className="border-t border-gray-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 text-sm sm:px-8 md:grid-cols-3"><div><div className="flex items-center gap-2"><img src={logoIcon} alt="" className="h-7 w-7" /><span className="font-bold text-gray-900">BookHive</span></div><p className="mt-2 text-gray-500">A smarter way to manage your library.</p></div><div><p className="font-semibold text-gray-800">Quick links</p><div className="mt-2 flex gap-4 text-gray-500"><Link to="/" className="hover:text-amber-600">Home</Link><Link to="/profile" className="hover:text-amber-600">Profile</Link></div></div><div><p className="font-semibold text-gray-800">Contact</p><div className="mt-2 flex gap-4 text-gray-500"><a href="mailto:hello@bookhive.example" className="flex items-center gap-1.5 hover:text-amber-600"><Mail size={15} /> Email</a><a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-amber-600"><GitBranch size={15} /> GitHub</a></div></div></div><div className="border-t border-gray-100 px-5 py-4 text-center text-xs text-gray-500">© {new Date().getFullYear()} BookHive. All rights reserved.</div></footer>;
}

export default Footer;
