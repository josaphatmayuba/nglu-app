import { cn } from "../utils/functions";

/**
 * Page header — matches the mockup pattern:
 * - title + optional subtitle on the left
 * - actions cluster on the right (buttons, date picker, search...)
 * - stacks on mobile, side-by-side on md+
 *
 * Usage:
 *   <PageHeader
 *     title="Ventes"
 *     subtitle="Toutes les factures de vente"
 *     actions={<><DatePicker /> <CreateButton /></>}
 *   />
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-3",
        compact ? "mb-3 md:mb-4" : "mb-5 md:mb-6",
        { [className]: className }
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-ink-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
