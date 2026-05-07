import { EyeOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const ViewBtn = ({ path, title }) => {
  return (
    <div>
      {title ? (
        <Link to={path}>
          <button className='flex justify-center items-center gap-2 rounded'>
            <EyeOutlined className='text-[1rem]' /> {title}
          </button>
        </Link>
      ) : (
        <Link to={path}>
          <button className='flex justify-center items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded mr-2'>
            <EyeOutlined />
          </button>
        </Link>
      )}
    </div>
  );
};

export default ViewBtn;
