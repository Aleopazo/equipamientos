import { cn } from "@/lib/utils";

interface StateSummary {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface CategorySummary {
  name: string;
  count: number;
}

interface EquipmentOverviewPanelProps {
  totalEquipment: number;
  openTickets: number;
  stateSummary: StateSummary[];
  categorySummary: CategorySummary[];
  lastUpdated?: Date;
}

export function EquipmentOverviewPanel({
  totalEquipment,
  openTickets,
  stateSummary,
  categorySummary,
  lastUpdated,
}: EquipmentOverviewPanelProps) {
  const criticalState = stateSummary.find((state) => state.name.toLowerCase().includes("crític"));
  const criticalCount = criticalState?.count ?? 0;

  const formattedUpdated =
    lastUpdated != null
      ? new Intl.DateTimeFormat("es-CL", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(lastUpdated)
      : null;

  return (
    <section className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-neutral-200 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Operaciones
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Panorama del día
        </h1>
        {formattedUpdated ? (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Actualizado {formattedUpdated}
          </p>
        ) : null}
      </header>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title="Equipos activos"
            value={totalEquipment}
            subtitle="Enviados a terreno"
          />
          <MetricCard
            title="Tickets abiertos"
            value={openTickets}
            subtitle="Incidentes pendientes"
            tone="warning"
          />
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Distribución por estado
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stateSummary.map((state) => (
              <li key={state.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: state.color }}
                  />
                  {state.name}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {state.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Equipamiento por categoría
          </h2>
          <div className="mt-3 grid gap-2">
            {categorySummary.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300"
              >
                <span>{category.name}</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {category.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto">
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="font-semibold">Equipos críticos</p>
          <p>
            {criticalCount > 0
              ? `${criticalCount} equipo${criticalCount === 1 ? "" : "s"} requieren revisión inmediata.`
              : "Sin equipos en estado crítico por ahora."}
          </p>
        </div>
      </footer>
    </section>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  tone?: "default" | "warning";
}

function MetricCard({ title, value, subtitle, tone = "default" }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        tone === "warning"
          ? "border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-neutral-100 bg-neutral-50/80 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
    </div>
  );
}

