import { cn } from "@/utils/functions";

export default function Button(props) {
  const { children, color, loading, onClick, type, icon, className, disabled } =
    props;
  return (
    <>
      <button
        onClick={onClick}
        type={type ? type : "button"}
        className={cn(
          "rounded-md  font-bold flex justify-center items-center disabled:cursor-not-allowed gap-3 w-full px-5 py-2 border hover:bg-primary/80 hover:text-white",
          { "bg-primary text-white hover:bg-primary/80": color === "primary" },
          { "bg-black text-white hover:bg-black/80": color === "black" },
          {
            "bg-gray-500 text-white border dark:hover:bg-slate-500 hover:bg-gray-300":
              color === "gray",
          },
          { [className]: className }
        )}
        disabled={loading || disabled}
      >
        {loading && (
          <div className='flex justify-center items-center'>
            <span className='animate-spin h-5 w-5 mr-3 border-4 rounded-full border-t-2 border-t-gray-500 block'></span>
          </div>
        )}
        {icon && icon}
        {children}
      </button>
    </>
  );
}
