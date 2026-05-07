import { cn } from "../utils/functions";

export default function Card({
  children,
  title,
  extra,
  className,
  headClass,
  bodyClass,
}) {
  return (
    <div
      className={cn(
        "cardContainer border border-gray-200 rounded-sm bg-white  dark:bg-[#1C1B20] transition-all duration-300",
        {
          [className]: className,
        }
      )}
    >
      {(title || extra) && (
        <div
          className={cn(
            "cartHeadContainer flex justify-between items-center p-3 border-b bg-white dark:bg-[#2A2A2F]",
            {
              [headClass]: headClass,
            }
          )}
        >
          <h1 className="cartTitle text-sm sm:text-base md:text-lg font-semibold px-2 pt-1 text-black/80 dark:text-white">
            {title}
          </h1>
          <div className="cartExtra flex gap-2 items-center">{extra}</div>
        </div>
      )}
      <div className={cn("", { [bodyClass]: bodyClass })}> {children}</div>
    </div>
  );
}
