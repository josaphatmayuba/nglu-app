import React from "react";

const SalaryTimelineSvg = () => {
  return (
    <div>
      <div className="bg-teal-600 w-6 h-6 flex items-center justify-center rounded-full -ml-3">
        <svg
          width="20px"
          height="20px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              d="M16.1667 7.41667L15.8159 7.14105C15.2873 6.72575 14.6346 6.5 13.9624 6.5H9.75C8.23122 6.5 7 7.73122 7 9.25V9.25C7 10.7688 8.23122 12 9.75 12H14.25C15.7688 12 17 13.2312 17 14.75V14.75C17 16.2688 15.7688 17.5 14.25 17.5H9.16695C8.41638 17.5 7.69307 17.2186 7.13978 16.7115L7 16.5833"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>{" "}
            <path
              d="M12 19L12 5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>{" "}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default SalaryTimelineSvg;
