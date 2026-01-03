import { type Prisma, type EquipmentState, TicketPriority, TicketStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

import { EquipmentDetailTabs } from "@/components/equipment/detail-tabs";
import {
  assignEquipmentState,
  deleteEquipment,
  updateEquipment,
} from "@/server/actions/equipment";
import { removeEquipmentFile, uploadEquipmentFile } from "@/server/actions/files";
import { addTicketComment, createTicket, deleteTicket, updateTicket } from "@/server/actions/tickets";
import { cn } from "@/lib/utils";

type EquipmentDetailData = Prisma.EquipmentGetPayload<{
  include: {
    currentState: true;
    primaryPhoto: true;
    files: true;
    tickets: {
      include: {
        comments: true;
      };
    };
    logs: {
      include: {
        state: true;
      };
    };
  };
}>;

interface EquipmentDetailProps {
  equipment: EquipmentDetailData;
  states: EquipmentState[];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function EquipmentDetail({ equipment, states }: EquipmentDetailProps) {
  const activeState = equipment.currentState;

  async function handleEquipmentUpdate(formData: FormData) {
    "use server";

    const equipmentId = formData.get("equipmentId");
    const name = formData.get("name");
    const code = formData.get("code");
    const category = formData.get("category");
    const description = formData.get("description");
    const notes = formData.get("notes");
    const positionX = formData.get("positionX");
    const positionY = formData.get("positionY");
    const photo = formData.get("photo");

    if (typeof equipmentId !== "string") {
      throw new Error("Equipo inválido.");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("El nombre es obligatorio.");
    }
    if (typeof code !== "string" || code.trim().length === 0) {
      throw new Error("El código interno es obligatorio.");
    }
    if (typeof category !== "string" || category.trim().length === 0) {
      throw new Error("La categoría es obligatoria.");
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

    await updateEquipment({
      id: equipmentId,
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
  }

  async function handleEquipmentDelete(formData: FormData) {
    "use server";

    const equipmentId = formData.get("equipmentId");
    if (typeof equipmentId !== "string") {
      throw new Error("Equipo inválido.");
    }

    await deleteEquipment({ id: equipmentId });
  }

  async function handleStateChange(formData: FormData) {
    "use server";

    const stateId = formData.get("stateId");
    const message = formData.get("stateMessage");
    const recordedBy = formData.get("recordedBy");

    if (typeof stateId !== "string" || stateId.length === 0) {
      throw new Error("Selecciona un estado válido.");
    }

    await assignEquipmentState({
      equipmentId: equipment.id,
      stateId,
      message: typeof message === "string" && message.trim().length > 0 ? message.trim() : undefined,
      recordedBy:
        typeof recordedBy === "string" && recordedBy.trim().length > 0
          ? recordedBy.trim()
          : undefined,
    });
  }

  async function handleFileUpload(formData: FormData) {
    "use server";

    const label = formData.get("label");
    const description = formData.get("description");
    const uploadedBy = formData.get("uploadedBy");
    const file = formData.get("file");

    if (typeof label !== "string" || label.length === 0) {
      throw new Error("El nombre del archivo es obligatorio.");
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Adjunta un archivo válido.");
    }

    await uploadEquipmentFile({
      equipmentId: equipment.id,
      label,
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : undefined,
      uploadedBy:
        typeof uploadedBy === "string" && uploadedBy.trim().length > 0
          ? uploadedBy.trim()
          : undefined,
      file,
    });
  }

  async function handleFileDelete(formData: FormData) {
    "use server";

    const fileId = formData.get("fileId");
    if (typeof fileId !== "string") {
      throw new Error("Archivo no encontrado.");
    }

    await removeEquipmentFile({ id: fileId });
  }

  async function handleTicketCreate(formData: FormData) {
    "use server";

    const title = formData.get("ticketTitle");
    const description = formData.get("ticketDescription");
    const priority = formData.get("ticketPriority");
    const reporter = formData.get("ticketReporter");

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("El título del ticket es obligatorio.");
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("La descripción del ticket es obligatoria.");
    }

    const parsedPriority =
      typeof priority === "string" && Object.values(TicketPriority).includes(priority as TicketPriority)
        ? (priority as TicketPriority)
        : TicketPriority.MEDIUM;

    await createTicket({
      equipmentId: equipment.id,
      title: title.trim(),
      description: description.trim(),
      reporter:
        typeof reporter === "string" && reporter.trim().length > 0 ? reporter.trim() : undefined,
      priority: parsedPriority,
    });
  }

  async function handleTicketStatus(formData: FormData) {
    "use server";

    const ticketId = formData.get("ticketId");
    const status = formData.get("status");

    if (typeof ticketId !== "string" || typeof status !== "string") {
      throw new Error("Ticket inválido.");
    }

    const ticketStatus = Object.values(TicketStatus).includes(status as TicketStatus)
      ? (status as TicketStatus)
      : TicketStatus.CREADO;

    await updateTicket({
      id: ticketId,
      status: ticketStatus,
    });
  }

  async function handleTicketDelete(formData: FormData) {
    "use server";

    const ticketId = formData.get("ticketId");
    if (typeof ticketId !== "string") {
      throw new Error("Ticket inválido.");
    }

    await deleteTicket({ id: ticketId });
  }

  async function handleTicketComment(formData: FormData) {
    "use server";

    const ticketId = formData.get("ticketId");
    const author = formData.get("author");
    const message = formData.get("commentMessage");

    if (typeof ticketId !== "string") {
      throw new Error("Ticket inválido.");
    }
    if (typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Debes ingresar un comentario.");
    }

    await addTicketComment({
      ticketId,
      author:
        typeof author === "string" && author.trim().length > 0 ? author.trim() : undefined,
      message: message.trim(),
    });
  }

  const priorityBadgeStyles: Record<TicketPriority, string> = {
    LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
    CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  };

  const tabs = [
    {
      id: "profile",
      label: "Ficha del equipo",
      description: "Información general y notas de operación.",
      content: (
        <div className="space-y-4">
          <form action={handleEquipmentUpdate} className="space-y-3 rounded-2xl border border-neutral-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
            <input type="hidden" name="equipmentId" value={equipment.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Nombre
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={equipment.name}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                />
              </label>
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Código interno
                <input
                  name="code"
                  type="text"
                  required
                  defaultValue={equipment.code}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                />
              </label>
            </div>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Categoría
              <input
                name="category"
                type="text"
                required
                defaultValue={equipment.category}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Foto principal
              <input
                name="photo"
                type="file"
                accept="image/*"
                className="mt-1 w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
              <span className="mt-1 block text-[11px] text-neutral-400 dark:text-neutral-500">
                Al guardar, la imagen reemplazará la foto principal actual.
              </span>
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Descripción
              <textarea
                name="description"
                rows={3}
                defaultValue={equipment.description ?? ""}
                className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Resumen del equipamiento, uso y particularidades."
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Notas internas
              <textarea
                name="notes"
                rows={2}
                defaultValue={equipment.notes ?? ""}
                className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Observaciones relevantes para logística, mantenimiento o cliente."
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Posición X
                <input
                  name="positionX"
                  type="number"
                  step="0.1"
                  defaultValue={
                    equipment.position != null && typeof equipment.position === "object"
                      ? (equipment.position as { x?: number }).x ?? ""
                      : ""
                  }
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
                  defaultValue={
                    equipment.position != null && typeof equipment.position === "object"
                      ? (equipment.position as { y?: number }).y ?? ""
                      : ""
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  placeholder="Opcional"
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              Guardar cambios
            </button>
          </form>

          <form
            action={handleEquipmentDelete}
            className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            <input type="hidden" name="equipmentId" value={equipment.id} />
            <p className="font-semibold">Eliminar equipamiento</p>
            <p className="mt-1 text-xs">
              Esta acción elimina el equipo junto a sus archivos, tickets e historial.
            </p>
            <button
              type="submit"
              className="mt-3 w-full rounded-lg border border-red-400 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-red-500/50 dark:text-red-200 dark:hover:bg-red-500/20 dark:focus:ring-red-600"
            >
              Eliminar definitivamente
            </button>
          </form>
        </div>
      ),
    },
    {
      id: "state",
      label: "Estado operativo",
      description: "Semáforo, observaciones y responsable en terreno.",
      content: (
        <form action={handleStateChange} className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Estado actual
            <select
              name="stateId"
              defaultValue={activeState?.id}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            >
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Observación
            <textarea
              name="stateMessage"
              rows={3}
              placeholder="Detalle el contexto o la acción recomendada..."
              className="mt-1 w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Responsable
            <input
              name="recordedBy"
              type="text"
              placeholder="Nombre del técnico o supervisor"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Actualizar estado
          </button>
        </form>
      ),
    },
    {
      id: "files",
      label: "Archivos",
      description: "Fichas técnicas y respaldos del equipo.",
      content: (
        <div className="space-y-4">
          <form
            action={handleFileUpload}
            className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 p-4 dark:border-neutral-600 dark:bg-neutral-900/40 md:grid-cols-[2fr,1fr]"
          >
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nombre del archivo
                  <input
                    name="label"
                    type="text"
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  />
                </label>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Responsable
                  <input
                    name="uploadedBy"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descripción
                <textarea
                  name="description"
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  placeholder="Instrucciones o contexto del documento"
                />
              </label>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <label className="flex h-full cursor-pointer flex-col items-center justify-center rounded-lg border border-neutral-300 border-dashed bg-white px-3 py-4 text-sm text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-300">
                <span>Adjuntar archivo</span>
                <input name="file" type="file" required className="hidden" />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
              >
                Subir archivo
              </button>
            </div>
          </form>

          <ul className="space-y-3">
            {equipment.files.length === 0 ? (
              <li className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                Sin archivos registrados.
              </li>
            ) : (
              equipment.files.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {file.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {file.fileName} • {formatBytes(file.size)} • {file.mimeType}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Actualizado: {formatDate(file.uploadedAt)}
                      {file.uploadedBy ? ` · Responsable: ${file.uploadedBy}` : ""}
                    </p>
                    {file.description ? (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {file.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/files/${file.id}`}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400 dark:hover:text-neutral-100"
                    >
                      Descargar
                    </Link>
                    <form action={handleFileDelete}>
                      <input type="hidden" name="fileId" value={file.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ),
    },
    {
      id: "tickets",
      label: "Tickets operativos",
      description: "Incidencias, observaciones y cierre de tareas.",
      content: (
        <div className="space-y-4">
          <form action={handleTicketCreate} className="space-y-3 rounded-xl bg-neutral-50/70 p-4 dark:bg-neutral-900/40">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Título
                <input
                  type="text"
                  name="ticketTitle"
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Prioridad
                <select
                  name="ticketPriority"
                  defaultValue={TicketPriority.MEDIUM}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                >
                  {Object.values(TicketPriority).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Descripción
              <textarea
                name="ticketDescription"
                rows={3}
                required
                className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Describe la situación en terreno..."
              />
            </label>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Reportado por
              <input
                type="text"
                name="ticketReporter"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                placeholder="Ej: Supervisor turno AM"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              Crear ticket
            </button>
          </form>

          <ul className="space-y-3">
            {equipment.tickets.length === 0 ? (
              <li className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                Sin tickets registrados.
              </li>
            ) : (
              equipment.tickets.map((ticket) => {
                const isFinalized = ticket.status === TicketStatus.FINALIZADO;
                const isInProgress = ticket.status === TicketStatus.EN_PROCESO;
                const isCritical = ticket.priority === TicketPriority.CRITICAL;

                const statusLabels: Record<TicketStatus, string> = {
                  [TicketStatus.CREADO]: "CREADO",
                  [TicketStatus.EN_PROCESO]: "EN PROCESO",
                  [TicketStatus.FINALIZADO]: "FINALIZADO",
                };

                return (
                  <li
                    key={ticket.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {ticket.title}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Creado: {formatDate(ticket.openedAt)}
                          {ticket.reporter ? ` · Reportado por ${ticket.reporter}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            priorityBadgeStyles[ticket.priority],
                          )}
                        >
                          {ticket.priority}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            isFinalized
                              ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                              : isInProgress
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                          )}
                        >
                          {statusLabels[ticket.status]}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                      {ticket.description}
                    </p>
                    {ticket.closedAt ? (
                      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                        Finalizado: {formatDate(ticket.closedAt)}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={handleTicketStatus} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <select
                          name="status"
                          defaultValue={ticket.status}
                          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                        >
                          <option value={TicketStatus.CREADO}>Creado</option>
                          <option value={TicketStatus.EN_PROCESO}>En proceso</option>
                          <option value={TicketStatus.FINALIZADO}>Finalizado</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400 dark:hover:text-neutral-100"
                        >
                          Actualizar estado
                        </button>
                      </form>
                      <form action={handleTicketDelete}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                    {isCritical ? (
                      <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200">
                        Atención inmediata recomendada. Coordinar al equipo técnico antes de despachar el servicio.
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Comentarios
                      </p>
                      {ticket.comments.length === 0 ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Sin comentarios todavía.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {ticket.comments.map((comment) => (
                            <li
                              key={comment.id}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                                  {comment.author ?? "Equipo"}
                                </span>
                                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                  {formatDate(comment.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                                {comment.message}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form action={handleTicketComment} className="space-y-2">
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input
                          name="author"
                          type="text"
                          placeholder="Tu nombre (opcional)"
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                        />
                        <textarea
                          name="commentMessage"
                          rows={2}
                          placeholder="Agregar comentario..."
                          className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                          required
                        />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400 dark:hover:text-neutral-100"
                        >
                          Añadir comentario
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ),
    },
    {
      id: "history",
      label: "Historial",
      description: "Últimos registros y cambios registrados.",
      content: (
        <ul className="space-y-3 text-sm">
          {equipment.logs.length === 0 ? (
            <li className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
              Sin registros todavía.
            </li>
          ) : (
            equipment.logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: log.state?.color ?? "#9CA3AF" }}
                    />
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {log.state?.name ?? "Actualización"}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {formatDate(log.recordedAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{log.message}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {log.recordedBy ? `Registrado por ${log.recordedBy}` : "Registro automático"}
                </p>
              </li>
            ))
          )}
        </ul>
      ),
    },
  ];

  return (
    <section className="flex h-full flex-1 flex-col gap-6 rounded-3xl border border-neutral-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <header className="flex flex-col gap-4 rounded-2xl bg-neutral-50/70 p-6 dark:bg-neutral-800/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {equipment.name}
            </h1>
            <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
              Código interno: {equipment.code}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
            style={{
              backgroundColor: `${activeState?.color ?? "#9CA3AF"}20`,
              color: activeState?.color ?? "#4B5563",
            }}
          >
            <span className="inline-flex h-3 w-3 rounded-full bg-current" aria-hidden />
            {activeState?.name ?? "Sin estado"}
          </span>
        </div>
        {equipment.primaryPhoto ? (
          <div className="relative h-56 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40">
            <Image
              src={`/files/${equipment.primaryPhoto.id}`}
              alt={`Foto principal de ${equipment.name}`}
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 text-sm text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-500">
            Sin foto principal. Puedes agregar una en la ficha.
          </div>
        )}
        {equipment.description ? (
          <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
            {equipment.description}
          </p>
        ) : null}
        {equipment.notes ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Notas: {equipment.notes}</p>
        ) : null}
      </header>

      <EquipmentDetailTabs tabs={tabs} defaultTabId="profile" />
    </section>
  );
}
