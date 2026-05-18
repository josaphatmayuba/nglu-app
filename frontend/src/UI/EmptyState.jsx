import { cn } from "../utils/functions";

const ACCENT_BG = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  ink: "bg-ink-100 text-ink-500",
};

/**
 * Empty state — matches the mockup pattern:
 * - circular icon tile
 * - heading
 * - subtle subtitle
 * - optional CTA
 *
 * Usage:
 *   <EmptyState
 *     icon={Truck}
 *     title="Aucun bon de commande"
 *     subtitle="Créez votre premier bon de commande..."
 *     action={<CreateButton title="Nouveau bon" to="/admin/..." />}
 *   />
 */
export default function EmptyState({
  icon: Icon,
  title = "Aucune donnée",
  subtitle,
  action,
  accent = "brand",
  className,
  inline = false,
}) {
  const accentClass = ACCENT_BG[accent] || ACCENT_BG.brand;
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-ink-200 flex flex-col items-center justify-center text-center",
        inline ? "py-8 px-4" : "p-8 md:p-12",
        { [className]: className }
      )}
    >
      {Icon && (
        <div
          className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4",
            accentClass
          )}
        >
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
      )}
      <h3 className="font-semibold text-ink-900 text-base mb-1.5">{title}</h3>
      {subtitle && (
        <p className="text-sm text-ink-500 max-w-sm mb-4">{subtitle}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
