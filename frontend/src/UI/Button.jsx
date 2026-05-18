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
          "rounded-lg font-medium text-sm flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-50 gap-2 w-full px-4 py-2 border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 hover:border-ink-300 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-100",
          {
            "bg-brand-600 text-white hover:bg-brand-700 border-brand-600 hover:border-brand-700":
              color === "primary",
          },
          {
            "bg-ink-900 text-white hover:bg-ink-800 border-ink-900":
              color === "black",
          },
          {
            "bg-ink-500 text-white border-ink-500 hover:bg-ink-600":
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
