import React from "react";

const BtnSearchSvg = ({ size, title, loading }) => {
  return (
    <div className='flex justify-between items-center'>
      <svg
        className={loading ? "animate-spin" : ""}
        width={`${size}px`}
        height={` ${size}px`}
        viewBox='0 0 24 24'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
        <g
          id='SVGRepo_tracerCarrier'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></g>
        <g id='SVGRepo_iconCarrier'>
          {" "}
          <path
            d='M18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11Z'
            fill='#ffffff'
          ></path>{" "}
          <path
            d='M20 20L18 18'
            stroke='#ffffff'
            strokeWidth='2'
            strokeLinecap='round'
          ></path>{" "}
        </g>
      </svg>
      <p className=''>{title}</p>
    </div>
  );
};

export default BtnSearchSvg;
