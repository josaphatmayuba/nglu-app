import { useEffect, useState } from "react";

import { Button, Skeleton } from "antd";

import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { BiSolidGridAlt } from "react-icons/bi";
import { RiFullscreenExitLine, RiFullscreenLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";

import BreadcrumbCustom from "./BreadcrumbCustom";
import HeaderQuickLink from "./HeaderQuickLink"; // Add this import (replace QuickLink import)
const toggler = [
  <svg
    width="20"
    height="20"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    key={0}>
    <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path>
  </svg>,
];

function Header({ onPress, data, loading }) {
  useEffect(() => window.scrollTo(0, 0));
  const isLogged = localStorage.getItem("isLogged");
  const user = localStorage.getItem("user");
  const [isDarkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const [fullScreen, setFullScreen] = useState(false);
  const [imageError, setImageError] = useState();
  const userId = localStorage.getItem("id");

  const element = document.documentElement;

  const handleFullScreenClick = () => {
    setFullScreen(true);
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };
  const handleExitFullScreenClick = () => {
    setFullScreen(false);
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  useEffect(() => {
    if (isDarkMode) document.body.className = "dark-theme dark";
    if (!isDarkMode) document.body.className = "light-theme light";
  }, [isDarkMode]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
      } else {
        setFullScreen(false);
      }
    });
  }, []);
  return (
    <>
      <div className="sticky top-0 z-10 w-full py-2 md:py-4 pl-4 bg-headerBg dark:bg-[#1C1B20] border-b border-gray-200 grid grid-cols-2 md:grid-cols-5 items-center">
        {/* Left Section: Logo (1 column) */}
        <div className="relative flex items-center col-span-1">
          {/* {isLogged && <BreadcrumbCustom />} */}
          <div className="md:hidden">
            <Skeleton loading={loading}>
              {data?.logo && !imageError ? (
                <img
                  className="text-white text-center mt-2 mb-1 h-12 md:h-16 w-auto max-w-40 md:max-w-48"
                  alt="logo"
                  src={data.logo}
                  onError={() => setImageError(true)}
                />
              ) : (
                <h2
                  className="text-gray-300 text-center mt-2 mb-1 flex items-center justify-center gap-2 h-12 md:h-16"
                  style={{ fontSize: "25px" }}>
                  OS
                  <strong style={{ color: "#55F", fontWeight: "bold" }}>
                    Inventory
                  </strong>
                </h2>
              )}
            </Skeleton>
          </div>
        </div>

        {/* Center Section: QuickLink (3 columns) */}
        <div className="col-span-3 flex justify-center hidden md:flex">
          {isLogged && <HeaderQuickLink />}
        </div>

        {/* Right Section: Buttons (1 column) */}
        <div className="flex items-center justify-end mr-[1rem] gap-1 md:gap-4 col-span-1">
          {/* <button
            onClick={() => navigate("/admin/pos")}
            className="hidden md:flex bg-primary py-1 px-2 text-white items-center gap-1">
            <BiSolidGridAlt size={20} /> <span>POS</span>
          </button> */}
          {isLogged && (
            <div>
              {fullScreen ? (
                <RiFullscreenExitLine
                  onClick={handleExitFullScreenClick}
                  size={22}
                  className="cursor-pointer dark:text-white"
                />
              ) : (
                <RiFullscreenLine
                  onClick={handleFullScreenClick}
                  size={22}
                  className="cursor-pointer dark:text-white"
                />
              )}
            </div>
          )}

          {isLogged && (
            <Button
              type="link"
              className="block md:hidden"
              onClick={() => onPress()}
              style={{ boxShadow: "none" }}>
              {toggler}
            </Button>
          )}

          {isLogged && (
            <span className="pb-1 relative group">
              <UserOutlined className="text-xl" />
              <div className="hidden z-[9999] absolute -right-3 p-2 group-hover:block w-[200px]">
                <div className="bg-white shadow-lg select-none p-1 min-w-[150px] rounded-lg">
                  <p className="flex items-center gap-1 px-3 py-2 hover:bg-slate-200 rounded-lg">
                    <UserOutlined style={{ fontSize: "16px" }} />{" "}
                    <Link
                      to={`/admin/hr/staffs/${userId}`}
                      className="logout-text uppercase font-weight-bold me-2 ms-1">
                      {user}
                    </Link>
                  </p>
                  <Link
                    to="/admin/auth/logout"
                    className="flex items-center gap-1 px-3 py-2 hover:bg-slate-200 rounded-lg">
                    <LogoutOutlined className="text-red-500" />
                    <span className="logout-text font-weight-bold">
                      Log Out
                    </span>
                  </Link>
                </div>
              </div>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;
