
export default function WishlistLoading() {
  return (
    <div className="grid grid-cols-12 gap-2 my-4 place-items-center ">
      <div className="col-span-8 lg:col-span-5 flex items-center gap-3">
        <span className="h-12 w-12 md:h-20 md:w-20 col-span-2 animate-pulse bg-slate-200 rounded"></span>
        <div className="flex flex-col gap-2">
          <h1 className="text-base lg:text-xl w-[100px] md:w-[140px] h-[10px] md:h-[20px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
          <div>
            <h1 className="text-base lg:text-xl w-[40px] md:w-[70px] h-[10px] md:h-[20px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
          </div>
          <div>
            <h1 className="text-base lg:text-xl w-[70px] md:w-[100px] h-[10px] md:h-[20px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
          </div>
        </div>
      </div>
      <div className="col-span-4 text-gray-500 lg:flex flex-wrap gap-10 hidden">
        <span>
          <h1 className="text-base lg:text-xl w-[100px] h-[20px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
        </span>
      </div>
      <div className="col-span-2">
        <h1 className="text-base lg:text-xl w-[30px] h-[20px] md:w-[60px]  md:h-[40px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
      </div>
      <div className="col-span-1">
        <h1 className="text-base lg:text-xl w-[30px] h-[20px] md:w-[60px]  md:h-[40px] rounded-sm font-medium animate-pulse bg-slate-200"></h1>
      </div>
    </div>
  );
}
