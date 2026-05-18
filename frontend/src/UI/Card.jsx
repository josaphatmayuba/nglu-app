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
        "cardContainer border border-ink-200 rounded-xl bg-white dark:bg-[#1C1B20] hover:border-ink-300 transition-colors",
        {
          [className]: className,
        }
      )}
    >
      {(title || extra) && (
        <div
          className={cn(
            "cartHeadContainer flex justify-between items-center gap-2 px-5 py-4 border-b border-ink-100 bg-white dark:bg-[#2A2A2F] rounded-t-xl",
            {
              [headClass]: headClass,
            }
          )}
        >
          <h1 className="cartTitle text-sm sm:text-base md:text-base font-semibold text-ink-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <div className="cartExtra flex gap-2 items-center">{extra}</div>
        </div>
      )}
      <div className={cn("", { [bodyClass]: bodyClass })}> {children}</div>
    </div>
  );
}
