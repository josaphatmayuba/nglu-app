import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

const ViewBtn = ({ path, title }) => {
  return (
    <div>
      {title ? (
        <Link to={path}>
          <button className="flex items-center gap-2 py-1 text-ink-700 hover:text-brand-600 transition rounded">
            <Eye className="w-4 h-4" /> {title}
          </button>
        </Link>
      ) : (
        <Link to={path}>
          <button className="flex justify-center items-center bg-brand-600 hover:bg-brand-700 text-white py-2 px-3 rounded-lg mr-2 transition shadow-sm">
            <Eye className="w-4 h-4" />
          </button>
        </Link>
      )}
    </div>
  );
};

export default ViewBtn;
