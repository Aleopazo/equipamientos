import { notFound } from "next/navigation";

import { EquipmentDetail } from "@/components/equipment/detail";
import { EquipmentListPanel } from "@/components/equipment/sidebar";
import { ensureSeedData } from "@/server/bootstrap";
import { getEquipmentDetail, getEquipmentOverview, listStates } from "@/server/queries/equipment";

interface PageProps {
  searchParams?: Promise<{ equipment?: string }>;
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;

  await ensureSeedData();

  const [equipment, states] = await Promise.all([getEquipmentOverview(), listStates()]);

  if (equipment.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Aún no hay equipamiento registrado
          </h1>
          <p className="mt-2 text-neutral-500">
            Utiliza las acciones del panel para crear equipos y comenzar a gestionarlos.
          </p>
        </div>
      </main>
    );
  }

  const selectedId = searchParams?.equipment ?? equipment[0]?.id;
  const selected = equipment.find((item) => item.id === selectedId);

  if (!selected) {
    notFound();
  }

  const detail = await getEquipmentDetail(selected.id);

  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-10 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <EquipmentListPanel equipment={equipment} activeId={detail.id} />
          <EquipmentDetail equipment={detail} states={states} />
        </div>
      </div>
    </main>
  );
}
