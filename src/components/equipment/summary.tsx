"use client";

import Link from "next/link";

import { type Prisma, TicketStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

type EquipmentIssueItem = Prisma.EquipmentGetPayload<{
  include: {
    car: true;
    currentState: true;
    tickets: true;
  };
}>;

interface EquipmentSummaryProps {
  equipment: EquipmentIssueItem[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function EquipmentIssuesSummary({ equipment }: EquipmentSummaryProps) {
  const alertsByCar = equipment.reduce<Record<string, EquipmentIssueItem[]>>((acc, item) => {
    const key = item.car.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const totalTickets = equipment.reduce((count, item) => {
    const openTickets = item.tickets.filter((ticket) => ticket.status !== TicketStatus.FINALIZADO);
    return count + openTickets.length;
  }, 0);

  const uniqueCarsImpacted = Object.keys(alertsByCar).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Equipos con incidencias
          </p>
          <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {equipment.length}
          </p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Tickets abiertos
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-500 dark:text-amber-300">{totalTickets}</p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Carros impactados
          </p>
          <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {uniqueCarsImpacted}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
        {equipment.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            Todo está operativo. No se detectan incidencias activas.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(alertsByCar)
              .sort(
                (a, b) =>
                  (a[0]?.car.order ?? Number.MAX_SAFE_INTEGER) -
                  (b[0]?.car.order ?? Number.MAX_SAFE_INTEGER),
              )
              .map((items) => {
                const car = items[0]?.car;
                if (!car) return null;

                return (
                  <section key={car.id} className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                          {car.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {items.length} equipo{items.length > 1 ? "s" : ""} requiere atención
                        </p>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {car.code}
                      </span>
                    </header>
                    <ul className="mt-3 space-y-3">
                      {items.map((item) => {
                        const openTickets = item.tickets.filter(
                          (ticket) => ticket.status !== TicketStatus.FINALIZADO,
                        );
                        const isCritical = (item.currentState?.level ?? 2) < 2;

                        return (
                          <li
                            key={item.id}
                            className="rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/80 dark:hover:border-neutral-600"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                  {item.name}
                                </p>
                                <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                                  {item.code}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                                  isCritical
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                                )}
                              >
                                {item.currentState?.name ?? "Sin estado"}
                              </span>
                            </div>
                            {openTickets.length > 0 ? (
                              <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                                {openTickets.length} ticket{openTickets.length > 1 ? "s" : ""} abierto
                                {openTickets.length > 1 ? "s" : ""}. Último:{" "}
                                {formatDate(openTickets[0]!.openedAt)}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                Sin tickets abiertos. Revisión pendiente.
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/?car=${car.id}&equipment=${item.id}`}
                                className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400 dark:hover:text-neutral-100"
                              >
                                Ver detalle
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

