import { AlertCircle, Inbox } from "lucide-react";

export function SectionSkeleton({ count = 3, className = "" }) {
  return <div className={`grid gap-4 ${className}`}>{Array.from({ length: count }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[#F3E8C8] bg-white p-4"><div className="h-4 w-1/3 rounded bg-amber-100" /><div className="mt-4 h-3 w-2/3 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/2 rounded bg-gray-100" /></div>)}</div>;
}

export function EmptyState({ message }) {
  return <div className="rounded-xl border border-dashed border-[#F3E8C8] bg-white px-5 py-8 text-center"><Inbox className="mx-auto text-amber-600" size={24} /><p className="mt-3 text-sm text-gray-500">{message}</p></div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="rounded-xl border border-red-100 bg-white px-5 py-6 text-center"><AlertCircle className="mx-auto text-red-600" size={22} /><p className="mt-2 text-sm text-gray-600">{message}</p><button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-amber-700 hover:text-amber-800">Try again</button></div>;
}
