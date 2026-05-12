import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { patientCopyRequest } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);
const optionalNullableStringSchema = z.string().min(1).nullable().optional();

const patientCopyRequestSchema = z.object({
  createdAt: z.date(),
  deadline: z.date(),
  deliveryChannel: z.string(),
  id: z.string(),
  legalBasis: z.string(),
  notes: z.string().nullable(),
  patientId: z.string(),
  patientName: z.string(),
  requester: z.string(),
  scope: z.string(),
  status: z.string(),
});

const createPatientCopyRequestSchema = z.object({
  deadline: z.coerce.date(),
  deliveryChannel: nonEmptyStringSchema,
  legalBasis: nonEmptyStringSchema,
  notes: optionalNullableStringSchema,
  patientId: nonEmptyStringSchema,
  patientName: nonEmptyStringSchema,
  requester: nonEmptyStringSchema,
  scope: nonEmptyStringSchema,
  status: z.string().default("Recibida"),
});

const listPatientCopyRequestsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: z.string().min(1).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().min(1).optional(),
});

const updatePatientCopyRequestSchema = z.object({
  deadline: z.coerce.date(),
  deliveryChannel: nonEmptyStringSchema,
  id: nonEmptyStringSchema,
  legalBasis: nonEmptyStringSchema,
  notes: optionalNullableStringSchema,
  patientId: nonEmptyStringSchema,
  patientName: nonEmptyStringSchema,
  requester: nonEmptyStringSchema,
  scope: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
});

const updateStatusSchema = z.object({
  id: nonEmptyStringSchema,
  status: z.enum(["Recibida", "En preparación", "Entregada", "Vencida"]),
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(patientCopyRequestSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createPatientCopyRequestProcedure = protectedProcedure
  .input(createPatientCopyRequestSchema)
  .output(patientCopyRequestSchema)
  .handler(async ({ context, input }) => {
    const createdAt = new Date();
    const [created] = await context.db
      .insert(patientCopyRequest)
      .values({
        ...input,
        id: crypto.randomUUID(),
        createdAt,
      })
      .returning();

    return created ?? throwCreateError("patient copy request");
  });

const getPatientCopyRequestProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(patientCopyRequestSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(patientCopyRequest)
      .where(eq(patientCopyRequest.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient copy request not found.",
      });
    }

    return found;
  });

const listPatientCopyRequestsProcedure = protectedProcedure
  .input(listPatientCopyRequestsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.patientId
        ? eq(patientCopyRequest.patientId, input.patientId)
        : undefined,
      input.status ? eq(patientCopyRequest.status, input.status) : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc"
        ? asc(patientCopyRequest.createdAt)
        : desc(patientCopyRequest.createdAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(patientCopyRequest)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db
        .select({ value: count() })
        .from(patientCopyRequest)
        .where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updatePatientCopyRequestProcedure = protectedProcedure
  .input(updatePatientCopyRequestSchema)
  .output(patientCopyRequestSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(patientCopyRequest)
      .set(values)
      .where(eq(patientCopyRequest.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient copy request not found.",
      });
    }

    return updated;
  });

const updateStatusProcedure = protectedProcedure
  .input(updateStatusSchema)
  .output(patientCopyRequestSchema)
  .handler(async ({ context, input }) => {
    const [updated] = await context.db
      .update(patientCopyRequest)
      .set({ status: input.status })
      .where(eq(patientCopyRequest.id, input.id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient copy request not found.",
      });
    }

    return updated;
  });

const deletePatientCopyRequestProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(patientCopyRequest)
      .where(eq(patientCopyRequest.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient copy request not found.",
      });
    }
    await context.db
      .delete(patientCopyRequest)
      .where(eq(patientCopyRequest.id, input.id));
    return true;
  });

export interface PatientCopyRequestsRouter extends Record<string, AnyRouter> {
  create: typeof createPatientCopyRequestProcedure;
  delete: typeof deletePatientCopyRequestProcedure;
  get: typeof getPatientCopyRequestProcedure;
  list: typeof listPatientCopyRequestsProcedure;
  update: typeof updatePatientCopyRequestProcedure;
  updateStatus: typeof updateStatusProcedure;
}

export const patientCopyRequestsRouter: PatientCopyRequestsRouter = {
  create: createPatientCopyRequestProcedure,
  delete: deletePatientCopyRequestProcedure,
  get: getPatientCopyRequestProcedure,
  list: listPatientCopyRequestsProcedure,
  update: updatePatientCopyRequestProcedure,
  updateStatus: updateStatusProcedure,
};
