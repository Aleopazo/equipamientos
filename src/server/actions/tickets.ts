"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TicketPriority, TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const ticketBaseSchema = z.object({
  equipmentId: z.string().cuid(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  reporter: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createTicket(input: z.infer<typeof ticketBaseSchema>) {
  const data = ticketBaseSchema.parse(input);

  const ticket = await prisma.ticket.create({
    data: {
      ...data,
      tags: data.tags ?? [],
      status: TicketStatus.CREADO,
    },
  });

  revalidatePath("/");
  return ticket;
}

const updateTicketSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(TicketStatus).optional(),
  assignee: z.string().optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  tags: z.array(z.string()).optional(),
  closedAt: z.date().nullable().optional(),
});

export async function updateTicket(input: z.infer<typeof updateTicketSchema>) {
  const { id, ...payload } = updateTicketSchema.parse(input);

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...payload,
      tags: payload.tags ?? undefined,
      closedAt:
        payload.status && payload.status === TicketStatus.FINALIZADO
          ? new Date()
          : payload.status
              ? null
              : payload.closedAt ?? undefined,
    },
  });

  revalidatePath("/");
  return ticket;
}

const deleteTicketSchema = z.object({
  id: z.string().cuid(),
});

export async function deleteTicket(input: z.infer<typeof deleteTicketSchema>) {
  const data = deleteTicketSchema.parse(input);

  await prisma.ticket.delete({
    where: { id: data.id },
  });

  revalidatePath("/");
}

const addCommentSchema = z.object({
  ticketId: z.string().cuid(),
  author: z.string().optional(),
  message: z.string().min(1, "El comentario no puede estar vacío"),
});

export async function addTicketComment(input: z.infer<typeof addCommentSchema>) {
  const data = addCommentSchema.parse(input);

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: data.ticketId,
      author:
        typeof data.author === "string" && data.author.trim().length > 0
          ? data.author.trim()
          : null,
      message: data.message.trim(),
    },
  });

  await prisma.ticket.update({
    where: { id: data.ticketId },
    data: {
      lastUpdateAt: new Date(),
    },
  });

  revalidatePath("/");
  return comment;
}

