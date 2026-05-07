import React from 'react'

export default function ReviewCardLoading() {
  return (
    <div className="border-b p-4">
      <div className="flex gap-3 items-center justify-between pb-2 ">
        <div className="flex gap-3 items-center">
          <span className="bg-slate-50 h-5 w-20 animate-pulse"></span>
          <span className="bg-slate-50 h-5 w-20 animate-pulse"></span>
        </div>
        <span className="bg-slate-50 h-5 w-20 animate-pulse"></span>
      </div>
      <div className="flex flex-col gap-3 mt-5">
        <div className="bg-slate-50 h-6 w-[80%] rounded animate-pulse"></div>
        <div className="bg-slate-50 h-6 w-1/2 rounded animate-pulse"></div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="bg-slate-50 h-[100px] w-[100px] rounded-lg animate-pulse"></div>
        <div className="bg-slate-50 h-[100px] w-[100px] rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}
