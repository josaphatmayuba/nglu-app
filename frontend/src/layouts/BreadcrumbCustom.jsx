import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function BreadcrumbCustom() {
  const navigate = useNavigate();
  const navigateBack = () => {
    navigate(-1);
  };
  const navigateForward = () => {
    window.history.forward();
  };
  const location = useLocation().pathname;
  const pathSegments = location.split("/").filter((segment) => segment !== "");
  const breadcrumbItems = pathSegments.map((segment, index) => {
    return {
      label: segment,
      path: `/${pathSegments.slice(0, index + 1).join("/")}`,
    };
  });
  return (
    <>
      <div className='py-2  md:flex hidden'>
        <div className='flex items-center gap-1'>
          <span
            className='flex items-center justify-center cursor-pointer hover:bg-slate-500 hover:text-white p-1'
            onClick={navigateBack}
          >
            <ArrowLeftOutlined />
          </span>
          <span
            className='flex items-center justify-center cursor-pointer hover:bg-slate-500 hover:text-white p-1 mr-1'
            onClick={navigateForward}
          >
            <ArrowRightOutlined />
          </span>
          {breadcrumbItems.map((item, index) => (
            <span key={index} className='breadcrumb-item'>
              {index !== breadcrumbItems.length - 1 ? (
                <Link to={item.path} className=''>
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
              {index !== breadcrumbItems.length - 1 && (
                <span className='breadcrumb-separator pl-1'> / </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
