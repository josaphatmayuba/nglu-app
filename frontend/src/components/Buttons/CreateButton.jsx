import { PlusOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

export default function CreateButton({ title, to }) {
  return (
    <Link to={to}>
      <button
        className={`xs:px-3 px-2 md:text-base py-[6px] lg:px-5  border bg-primary
         hover:bg-primary/60 text-white rounded cursor-pointer`}
      >
        <span className='flex items-center justify-center gap-1 md:gap-2 '>
          {<PlusOutlined />}
          <span className=''>{title || "Add Item"}</span>
        </span>
      </button>
    </Link>
  );
}
