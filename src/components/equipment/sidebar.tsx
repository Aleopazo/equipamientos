"use client";

import { useState, useTransition, FormEvent } from "react";
import Link from "next/link";

import { type Prisma } from "@prisma/client";

import { cn } from "@/lib/utils";
import { createEquipment } from "@/server/actions/equipment";

type EquipmentSummary = Prisma.EquipmentGetPayload<{
  include: {
    currentState: true;
    tickets: {
      where: {
        NOT: { status: "CLOSED" };
      };
      orderBy: {
        openedAt: "desc";
      };
    };
  };
}>;

interface EquipmentListPanelProps {
  equipment: EquipmentSummary[];
  activeId?: string;
}

function getCategories(equipment: EquipmentSummary[]) {
  const unique = Array.from(new Set(equipment.map((item) => item.category)));
  return unique.sort((a, b) => a.localeCompare(b));
}

export function EquipmentListPanel({ equipment, activeId }: EquipmentListPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const categories = getCategories(equipment);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const code = formData.get("code");
    const category = formData.get("category");
    const description = formData.get("description");
    const notes = formData.get("notes");
    const positionX = formData.get("positionX");
    const positionY = formData.get("positionY");
    const photo = formData.get("photo");

    if (typeof name !== "string" || typeof code !== "string" || typeof category !== "string") {
      setErrorMessage("Completa los campos obligatorios.");
      return;
    }

    const parsedX =
      typeof positionX === "string" && positionX.trim().length > 0
        ? Number.parseFloat(positionX)
        : undefined;
    const parsedY =
      typeof positionY === "string" && positionY.trim().length > 0
        ? Number.parseFloat(positionY)
        : undefined;

    const photoFile =
      photo instanceof File && photo.size > 0 ? photo : undefined;

    startTransition(async () => {
      setErrorMessage(null);
      try {
        await createEquipment({
          name: name.trim(),
          code: code.trim(),
          category: category.trim(),
          description:
            typeof description === "string" && description.trim().length > 0
              ? description.trim()
              : undefined,
          notes:
            typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : undefined,
          position:
            parsedX != null && Number.isFinite(parsedX) && parsedY != null && Number.isFinite(parsedY)
              ? { x: parsedX, y: parsedY }
              : undefined,
          photo: photoFile,
        });
        form.reset();
        setIsModalOpen(false);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("No se pudo crear el equipamiento. Intenta nuevamente.");
        }
      }
    });
  };

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  return (
    <aside className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white/75 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
      <header className="border-b border-neutral-100/60 px-6 py-5 dark:border-neutral-800/60">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Equipamiento en terreno
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Crea nuevos equipos o selecciona uno existente para revisar el detalle.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Nuevo equipamiento
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {isModalOpen ? (
          <CreateEquipmentModal
            categories={categories}
            isPending={isPending}
            errorMessage={errorMessage}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />
        ) : null}
        <div className="relative ps-6">
          <span className="absolute left-[10px] top-0 h-full w-px bg-gradient-to-b from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
          <ul className="mt-6 space-y-4">
            {equipment.map((item) => {
              const isActive = item.id === activeId;
              const activeState = item.currentState;
              const color = activeState?.color ?? "#9CA3AF";
              const openTickets = item.tickets.length;

              return (
                <li key={item.id} className="relative">
                  <span
                    className="absolute -start-6 top-4 inline-flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  >
                    <span className="inline-block h-2 w-2 rounded-full border border-white/80" />
                  </span>
                  <Link
                    href={`/?equipment=${item.id}`}
                    scroll={false}
                    className={cn(
                      "block rounded-2xl border border-transparent p-4 transition-colors",
                      "bg-neutral-50/60 hover:bg-neutral-100/80 dark:bg-neutral-800/50 dark:hover:bg-neutral-700",
                      isActive &&
                        "border-neutral-400 bg-white shadow-md dark:border-neutral-500 dark:bg-neutral-800",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.name}
                        </p>
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                          {item.code}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full bg-neutral-200/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-700 dark:bg-neutral-700/70 dark:text-neutral-200"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {activeState?.name ?? "Sin estado"}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{item.category}</span>
                      {openTickets > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200">
                          {openTickets} ticket{openTickets > 1 ? "s" : ""} abiertos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          Sin tickets
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}

interface CreateEquipmentModalProps {
  categories: string[];
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

function CreateEquipmentModal({
  categories,
  isPending,
  errorMessage,
  onSubmit,
  onClose,
}: CreateEquipmentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 px-4 py-10 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Nuevo equipamiento
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Completa la ficha y adjunta una foto representativa del equipo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-200 dark:focus:ring-neutral-600"
            aria-label="Cerrar modal de creación"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Nombre
              <input
                name="name"
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Ej: Robot de limpieza"
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Código interno
              <input
                name="code"
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Ej: ECR-ROB-002"
              />
            </label>
          </div>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Categoría
            <input
              name="category"
              list="equipment-categories"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              placeholder="Selecciona o escribe una categoría"
            />
            {categories.length > 0 ? (
              <datalist id="equipment-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            ) : null}
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Foto del equipamiento
            <input
              name="photo"
              type="file"
              accept="image/*"
              required
              className="mt-1 w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Descripción
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              placeholder="Resumen operativo del equipo"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Notas internas
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              placeholder="Observaciones para logística o mantención"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Posición X
              <input
                name="positionX"
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Opcional"
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Posición Y
              <input
                name="positionY"
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Opcional"
              />
            </label>
          </div>
          {errorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
          ) : null}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100 dark:focus:ring-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:focus:ring-neutral-600"
            >
              {isPending ? "Creando..." : "Crear equipamiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

