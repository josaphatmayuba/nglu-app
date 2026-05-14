import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateButton({ title, to }) {
  return (
    <Link to={to}>
      <button
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <Plus className="w-4 h-4" />
        <span className="whitespace-nowrap">{title || "Add Item"}</span>
      </button>
    </Link>
  );
}
