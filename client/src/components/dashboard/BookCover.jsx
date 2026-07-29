import { BookOpen } from "lucide-react";
import { useState } from "react";

function BookCover({ book, className = "" }) {
  const [imageError, setImageError] = useState(false);
  const title = book?.title || "Untitled book";

  if (book?.coverImage && !imageError) {
    return <img src={book.coverImage} alt={`Cover of ${title}`} onError={() => setImageError(true)} className={`aspect-[3/4] w-full rounded-lg object-cover ${className}`} />;
  }

  return <div className={`flex aspect-[3/4] w-full flex-col justify-end rounded-lg bg-amber-100 p-3 text-amber-900 shadow-sm ${className}`}><BookOpen size={18} /><span className="mt-2 line-clamp-3 text-sm font-bold leading-tight">{title}</span></div>;
}

export default BookCover;
