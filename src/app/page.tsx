import { notFound } from "next/navigation";

import { CarSwitcher } from "@/components/car-switcher";
import { EquipmentDetail } from "@/components/equipment/detail";
import { EquipmentListPanel } from "@/components/equipment/sidebar";
import { EquipmentIssuesSummary } from "@/components/equipment/summary";
import { ensureSeedData } from "@/server/bootstrap";
import {
  getEquipmentDetail,
  getEquipmentOverviewByCar,
  getEquipmentWithIssues,
  listCars,
  listStates,
} from "@/server/queries/equipment";

interface PageProps {
  searchParams?: Promise<{ equipment?: string; car?: string; view?: string }>;
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;

  await ensureSeedData();

  const [cars, states] = await Promise.all([listCars(), listStates()]);

  if (cars.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Aún no hay carros configurados
          </h1>
          <p className="mt-2 text-neutral-500">
            Ejecuta el seed inicial o crea los carros manualmente en la base de datos.
          </p>
        </div>
      </main>
    );
  }

  const viewMode = searchParams?.view === "summary" ? "summary" : "car";
  const resolvedCarId =
    viewMode === "car" ? searchParams?.car ?? cars[0]?.id ?? undefined : undefined;

  const listData =
    viewMode === "summary"
      ? await getEquipmentWithIssues()
      : resolvedCarId
        ? await getEquipmentOverviewByCar(resolvedCarId)
        : [];

  if (viewMode === "car" && resolvedCarId == null) {
    notFound();
  }

  let detail = null;
  let activeEquipmentId: string | undefined;

  if (viewMode === "car" && listData.length > 0) {
    const preferredEquipmentId = searchParams?.equipment;
    const selected =
      listData.find((item) => item.id === preferredEquipmentId) ?? listData[0];

    detail = await getEquipmentDetail(selected.id);

    if (!detail) {
      notFound();
    }

    activeEquipmentId = detail.id;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-10 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <CarSwitcher
          cars={cars}
          activeCarId={viewMode === "car" ? resolvedCarId : undefined}
          isSummary={viewMode === "summary"}
        />
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <EquipmentListPanel
            equipment={listData}
            activeId={activeEquipmentId}
            mode={viewMode === "summary" ? "summary" : "car"}
            cars={cars}
            activeCarId={resolvedCarId}
          />
          {viewMode === "summary" ? (
            <EquipmentIssuesSummary equipment={listData} />
          ) : detail ? (
            <EquipmentDetail equipment={detail} states={states} cars={cars} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
              Este carro no tiene equipamiento asignado todavía.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
