import React from 'react'

export default function SingleProductLoader() {
  return (
    <div>
      <div className="container mt-10">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-[30%] bg-white p-4 rounded">
            <h1 className="h-[300px] md:h-[70%] w-full my-2 animate-pulse bg-slate-100 rounded"></h1>
            <div className="flex gap-5">
              {" "}
              <h1 className="h-16 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
              <h1 className="h-16 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
              <h1 className="h-16 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
              <h1 className="h-16 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
            </div>
          </div>
          <div className="w-full md:w-[40%] flex flex-col gap-4 bg-white p-4 rounded">
            <div>
              <h1 className="h-[20px] w-[150px] rounded my-2 animate-pulse bg-slate-100"></h1>
              <div className="flex items-center gap-5">
                <span className="h-[20px] w-[90px] rounded my-1 animate-pulse bg-slate-100"></span>
                <span className="h-[20px] w-[90px] rounded my-1 animate-pulse bg-slate-100"></span>
              </div>
              <div className="flex items-center justify-between gap-5">
                <h1 className="h-[20px] w-[150px] rounded my-2 animate-pulse bg-slate-100"></h1>

                <div className="flex gap-4">
                  <h1 className="h-[20px] w-[40px] rounded my-2 animate-pulse bg-slate-100"></h1>
                  <h1 className="h-[20px] w-[40px] rounded my-2 animate-pulse bg-slate-100"></h1>
                </div>
              </div>
            </div>
            <div className="border-t border-b py-2">
              <h1 className="h-[30px] w-[70px] rounded my-2 animate-pulse bg-slate-100"></h1>
            </div>
            <div>
              <div className="flex gap-2 items-start">
                <h1 className="h-[20px] w-[50px] rounded animate-pulse bg-slate-100"></h1>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-10">
                <h1 className="h-[40px] w-[120px] rounded my-2 animate-pulse bg-slate-100"></h1>
                <div className="flex justify-between gap-3">
                  {/* <h1 className="h-[40px] w-[120px] rounded my-2 animate-pulse bg-slate-100"></h1> */}
                  <h1 className="h-[40px] w-[120px] rounded my-2 animate-pulse bg-slate-100"></h1>
                </div>
              </div>

              <div className="flex gap-2 items-center mt-10">
                <h1 className="h-[20px] w-[70px] rounded my-2 animate-pulse bg-slate-100"></h1>
                <h1 className="h-[20px] w-[70px] rounded my-2 animate-pulse bg-slate-100"></h1>
                <h1 className="h-[20px] w-[70px] rounded my-2 animate-pulse bg-slate-100"></h1>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[30%]">
            {/* //shipping charge */}
            <div className="bg-white p-4 rounded w-full h-full">
              <h1 className="h-14 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
              <h1 className="h-14 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
              <h1 className="h-14 w-full my-5 animate-pulse bg-slate-100 rounded"></h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
