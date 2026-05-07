import React from "react";

export default function OrderLoading() {
  return (
    <div className="my-5">
      <div className="container bg-white py-5 my-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-16 md:w-32 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-5 w-32 md:w-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-24 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <hr />
        <div className="flex justify-between">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-5 w-36 bg-gray-100 rounded animate-pulse"></div>
        </div>

        <div className="my-3 mx-10">
          <div className="h-[70px] w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="my-3 mx-10">
          <div className="h-[70px] w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="my-3 mx-10">
          <div className="h-[70px] w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="container bg-white py-5 my-5">
        <div className="flex justify-between ">
          <div className="h-[150px] w-[500px] bg-gray-100 rounded animate-pulse"></div>
          <div className="h-[150px] w-[400px] bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
