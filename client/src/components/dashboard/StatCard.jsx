import { motion } from "framer-motion";

function StatCard({ icon: Icon, label, value, detail }) {
  return <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#F3E8C8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-[#1F2937]">{value}</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Icon size={20} /></span></div><p className="mt-3 text-xs text-gray-500">{detail}</p></motion.article>;
}

export default StatCard;
